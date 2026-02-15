"""Whisper 语音识别服务"""

import os
import tempfile
import asyncio
from dataclasses import dataclass
from typing import Optional
from pathlib import Path

# 尝试导入 whisper，如果不可用则使用 mock
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False


@dataclass
class TranscriptionResult:
    """转写结果"""
    text: str
    language: str
    success: bool = True
    error: Optional[str] = None
    duration: float = 0.0


class WhisperService:
    """
    Whisper 语音识别服务
    
    使用 OpenAI Whisper 模型进行语音转文字
    """
    
    # 模型大小选项
    MODEL_SIZES = ["tiny", "base", "small", "medium", "large"]
    
    def __init__(self, model_size: str = "base"):
        """
        初始化 Whisper 服务
        
        Args:
            model_size: 模型大小 (tiny, base, small, medium, large)
                       - tiny: 最快，准确率较低
                       - base: 平衡选择（推荐）
                       - small: 更准确，速度适中
                       - medium: 高准确率
                       - large: 最高准确率，需要更多资源
        """
        self.model_size = model_size
        self.model = None
        self._model_loaded = False
        
        if not WHISPER_AVAILABLE:
            print("Warning: Whisper not installed. Voice recognition will use mock mode.")
    
    def _ensure_model_loaded(self):
        """确保模型已加载"""
        if not self._model_loaded and WHISPER_AVAILABLE:
            print(f"Loading Whisper model: {self.model_size}")
            self.model = whisper.load_model(self.model_size)
            self._model_loaded = True
    
    async def transcribe(
        self,
        audio_data: bytes,
        language: str = "zh",
        format: str = "webm"
    ) -> TranscriptionResult:
        """
        转写音频
        
        Args:
            audio_data: 音频数据（二进制）
            language: 语言代码 (zh=中文, en=英文, auto=自动检测)
            format: 音频格式 (webm, mp3, wav, m4a 等)
            
        Returns:
            TranscriptionResult 包含转写文本
        """
        if not WHISPER_AVAILABLE:
            return await self._mock_transcribe(audio_data)
        
        try:
            # 在线程池中运行同步的 Whisper 处理
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self._transcribe_sync(audio_data, language, format)
            )
            return result
            
        except Exception as e:
            return TranscriptionResult(
                text="",
                language=language,
                success=False,
                error=str(e)
            )
    
    def _transcribe_sync(
        self,
        audio_data: bytes,
        language: str,
        format: str
    ) -> TranscriptionResult:
        """同步转写"""
        self._ensure_model_loaded()
        
        # 保存音频到临时文件
        suffix = f".{format}"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            f.write(audio_data)
            temp_path = f.name
        
        try:
            # 转写参数
            options = {
                "fp16": False,  # CPU 上使用 fp32
                "language": language if language != "auto" else None,
            }
            
            # 执行转写
            result = self.model.transcribe(temp_path, **options)
            
            return TranscriptionResult(
                text=result["text"].strip(),
                language=result.get("language", language),
                success=True,
                duration=result.get("duration", 0.0)
            )
            
        finally:
            # 清理临时文件
            try:
                os.unlink(temp_path)
            except:
                pass
    
    async def _mock_transcribe(self, audio_data: bytes) -> TranscriptionResult:
        """Mock 转写（当 Whisper 不可用时）"""
        # 模拟一些延迟
        await asyncio.sleep(0.5)
        
        # 返回模拟结果
        return TranscriptionResult(
            text="[Mock] 这是一段模拟的语音识别结果。请安装 openai-whisper 以启用真实语音识别。",
            language="zh",
            success=True,
            error="Whisper not installed - using mock mode"
        )
    
    async def transcribe_file(
        self,
        file_path: str,
        language: str = "zh"
    ) -> TranscriptionResult:
        """
        从文件转写
        
        Args:
            file_path: 音频文件路径
            language: 语言代码
            
        Returns:
            TranscriptionResult
        """
        try:
            with open(file_path, "rb") as f:
                audio_data = f.read()
            
            # 获取文件格式
            format = Path(file_path).suffix.lstrip(".")
            
            return await self.transcribe(audio_data, language, format)
            
        except Exception as e:
            return TranscriptionResult(
                text="",
                language=language,
                success=False,
                error=str(e)
            )
    
    @staticmethod
    def get_supported_formats() -> list:
        """获取支持的音频格式"""
        return [
            "mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm",
            "ogg", "flac", "aac"
        ]
    
    @staticmethod
    def get_supported_languages() -> dict:
        """获取支持的语言"""
        return {
            "zh": "中文",
            "en": "English",
            "ja": "日本語",
            "ko": "한국어",
            "auto": "自动检测"
        }


# 全局服务实例（懒加载）
_whisper_service: Optional[WhisperService] = None


def get_whisper_service(model_size: str = "base") -> WhisperService:
    """获取 Whisper 服务实例"""
    global _whisper_service
    if _whisper_service is None:
        model = os.getenv("WHISPER_MODEL", model_size)
        _whisper_service = WhisperService(model_size=model)
    return _whisper_service
