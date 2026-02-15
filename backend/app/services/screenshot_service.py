"""
Screenshot Service

截图采集和处理服务。
前端通过 html2canvas 截图后发送 Base64 给后端。
"""

import os
import base64
import hashlib
from io import BytesIO
from dataclasses import dataclass
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from pathlib import Path

from PIL import Image


# ============== 配置 ==============

@dataclass
class ScreenshotConfig:
    """截图配置"""
    save_dir: str = "screenshots"
    max_width: int = 1920
    max_height: int = 1080
    quality: int = 85
    format: str = "webp"  # webp, png, jpeg
    
    @classmethod
    def from_env(cls) -> "ScreenshotConfig":
        return cls(
            save_dir=os.getenv("SCREENSHOT_DIR", "screenshots"),
            max_width=int(os.getenv("SCREENSHOT_MAX_WIDTH", "1920")),
            max_height=int(os.getenv("SCREENSHOT_MAX_HEIGHT", "1080")),
            quality=int(os.getenv("SCREENSHOT_QUALITY", "85")),
            format=os.getenv("SCREENSHOT_FORMAT", "webp"),
        )


# ============== Screenshot 数据 ==============

@dataclass
class Screenshot:
    """截图数据"""
    id: str                           # 唯一 ID (hash)
    data: bytes                       # 原始数据
    width: int
    height: int
    timestamp: str
    session_id: Optional[str] = None
    page_path: Optional[str] = None
    
    @property
    def base64(self) -> str:
        """获取 Base64 编码"""
        return base64.b64encode(self.data).decode("utf-8")
    
    @property
    def data_url(self) -> str:
        """获取 data URL"""
        return f"data:image/png;base64,{self.base64}"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "width": self.width,
            "height": self.height,
            "timestamp": self.timestamp,
            "session_id": self.session_id,
            "page_path": self.page_path,
            "size_bytes": len(self.data),
        }


# ============== Screenshot Service ==============

class ScreenshotService:
    """
    截图服务
    
    负责接收、处理、存储和检索截图
    """
    
    def __init__(self, config: Optional[ScreenshotConfig] = None):
        self.config = config or ScreenshotConfig.from_env()
        self._cache: Dict[str, Screenshot] = {}  # id -> Screenshot
        self._session_screenshots: Dict[str, List[str]] = {}  # session_id -> [screenshot_ids]
        
        # 确保保存目录存在
        Path(self.config.save_dir).mkdir(parents=True, exist_ok=True)
    
    def receive(
        self,
        base64_data: str,
        session_id: Optional[str] = None,
        page_path: Optional[str] = None,
    ) -> Screenshot:
        """
        接收前端发送的截图
        
        Args:
            base64_data: Base64 编码的图片数据 (可能包含 data: 前缀)
            session_id: 会话 ID
            page_path: 当前页面路径
            
        Returns:
            Screenshot 对象
        """
        # 解码 Base64
        if "," in base64_data:
            base64_data = base64_data.split(",")[1]
        
        image_bytes = base64.b64decode(base64_data)
        
        # 计算 hash 作为 ID
        screenshot_id = hashlib.md5(image_bytes).hexdigest()[:12]
        
        # 获取图片尺寸
        image = Image.open(BytesIO(image_bytes))
        width, height = image.size
        
        # 创建 Screenshot 对象
        screenshot = Screenshot(
            id=screenshot_id,
            data=image_bytes,
            width=width,
            height=height,
            timestamp=datetime.now().isoformat(),
            session_id=session_id,
            page_path=page_path,
        )
        
        # 缓存
        self._cache[screenshot_id] = screenshot
        
        # 关联到会话
        if session_id:
            if session_id not in self._session_screenshots:
                self._session_screenshots[session_id] = []
            self._session_screenshots[session_id].append(screenshot_id)
        
        return screenshot
    
    def get(self, screenshot_id: str) -> Optional[Screenshot]:
        """获取截图"""
        return self._cache.get(screenshot_id)
    
    def get_session_screenshots(self, session_id: str) -> List[Screenshot]:
        """获取会话的所有截图"""
        ids = self._session_screenshots.get(session_id, [])
        return [self._cache[id] for id in ids if id in self._cache]
    
    def get_latest(self, session_id: str) -> Optional[Screenshot]:
        """获取会话的最新截图"""
        screenshots = self.get_session_screenshots(session_id)
        return screenshots[-1] if screenshots else None
    
    def resize(
        self,
        screenshot: Screenshot,
        max_width: Optional[int] = None,
        max_height: Optional[int] = None,
    ) -> bytes:
        """
        调整截图尺寸
        
        Returns:
            调整后的图片 bytes
        """
        max_width = max_width or self.config.max_width
        max_height = max_height or self.config.max_height
        
        image = Image.open(BytesIO(screenshot.data))
        
        # 计算缩放比例
        ratio = min(max_width / image.width, max_height / image.height)
        
        if ratio < 1:
            new_size = (int(image.width * ratio), int(image.height * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        # 保存
        buffer = BytesIO()
        if self.config.format == "webp":
            image.save(buffer, format="WEBP", quality=self.config.quality)
        elif self.config.format == "jpeg":
            image.save(buffer, format="JPEG", quality=self.config.quality)
        else:
            image.save(buffer, format="PNG")
        
        return buffer.getvalue()
    
    def save(self, screenshot: Screenshot, filename: Optional[str] = None) -> str:
        """
        保存截图到文件
        
        Returns:
            保存的文件路径
        """
        if not filename:
            ext = self.config.format
            filename = f"{screenshot.id}_{screenshot.timestamp.replace(':', '-')}.{ext}"
        
        filepath = Path(self.config.save_dir) / filename
        
        with open(filepath, "wb") as f:
            f.write(screenshot.data)
        
        return str(filepath)
    
    def compare(
        self,
        screenshot1: Screenshot,
        screenshot2: Screenshot,
    ) -> float:
        """
        比较两张截图的相似度
        
        Returns:
            相似度 (0-1)
        """
        # 简单的哈希比较
        if screenshot1.id == screenshot2.id:
            return 1.0
        
        # 使用感知哈希
        try:
            from imagehash import phash
            
            img1 = Image.open(BytesIO(screenshot1.data))
            img2 = Image.open(BytesIO(screenshot2.data))
            
            hash1 = phash(img1)
            hash2 = phash(img2)
            
            # 汉明距离转相似度
            distance = hash1 - hash2
            max_distance = 64  # 8x8 hash
            similarity = 1 - (distance / max_distance)
            
            return similarity
        except ImportError:
            # 没有 imagehash，使用简单的尺寸比较
            if screenshot1.width == screenshot2.width and screenshot1.height == screenshot2.height:
                return 0.5
            return 0.0
    
    def detect_change(
        self,
        before: Screenshot,
        after: Screenshot,
        threshold: float = 0.9,
    ) -> bool:
        """
        检测截图是否发生变化
        
        Args:
            before: 操作前截图
            after: 操作后截图
            threshold: 相似度阈值，低于此值认为发生变化
            
        Returns:
            是否发生变化
        """
        similarity = self.compare(before, after)
        return similarity < threshold
    
    def clear_session(self, session_id: str):
        """清理会话的截图"""
        ids = self._session_screenshots.pop(session_id, [])
        for id in ids:
            self._cache.pop(id, None)
    
    def clear_old(self, max_age_seconds: int = 3600):
        """清理过期截图"""
        now = datetime.now()
        to_remove = []
        
        for id, screenshot in self._cache.items():
            created = datetime.fromisoformat(screenshot.timestamp)
            age = (now - created).total_seconds()
            if age > max_age_seconds:
                to_remove.append(id)
        
        for id in to_remove:
            self._cache.pop(id, None)


# ============== 全局实例 ==============

_screenshot_service: Optional[ScreenshotService] = None


def get_screenshot_service() -> ScreenshotService:
    """获取全局截图服务实例"""
    global _screenshot_service
    if _screenshot_service is None:
        _screenshot_service = ScreenshotService()
    return _screenshot_service


# ============== 导出 ==============

__all__ = [
    "ScreenshotConfig",
    "Screenshot",
    "ScreenshotService",
    "get_screenshot_service",
]
