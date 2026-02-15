"""
MobileAgent Client

MobileAgent (GUI-Owl) API 客户端，支持 ModelScope API 调用。
基于 MobileAgent-v3 的 GUIOwlWrapper 实现。

支持的模型:
- mPLUG/GUI-Owl-7B
- mPLUG/GUI-Owl-32B
"""

import os
import base64
import asyncio
from io import BytesIO
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Tuple
from PIL import Image

from openai import AsyncOpenAI

from app.services.agent_provider import (
    AgentProvider,
    AgentType,
    AgentResponse,
)


@dataclass
class MobileAgentConfig:
    """MobileAgent 配置"""
    api_key: str = ""
    base_url: str = "https://api-inference.modelscope.cn/v1"
    model: str = "mPLUG/GUI-Owl-7B"
    max_tokens: int = 3000
    temperature: float = 0.0
    max_retry: int = 3
    timeout: int = 60
    
    # 图片处理参数
    min_pixels: int = 3136
    max_pixels: int = 10035200
    resize_factor: int = 28
    
    @classmethod
    def from_env(cls) -> "MobileAgentConfig":
        """从环境变量加载配置"""
        return cls(
            api_key=os.getenv("MOBILE_AGENT_API_KEY", ""),
            base_url=os.getenv("MOBILE_AGENT_BASE_URL", "https://api-inference.modelscope.cn/v1"),
            model=os.getenv("MOBILE_AGENT_MODEL", "mPLUG/GUI-Owl-7B"),
            max_tokens=int(os.getenv("MOBILE_AGENT_MAX_TOKENS", "3000")),
            temperature=float(os.getenv("MOBILE_AGENT_TEMPERATURE", "0.0")),
        )


def smart_resize(height: int, width: int, factor: int = 28, 
                 min_pixels: int = 3136, max_pixels: int = 10035200) -> Tuple[int, int]:
    """
    智能调整图片尺寸
    
    参考 qwen_vl_utils 的实现
    """
    import math
    
    # 计算当前像素数
    current_pixels = height * width
    
    # 如果在范围内，只需要对齐到 factor
    if min_pixels <= current_pixels <= max_pixels:
        new_height = round(height / factor) * factor
        new_width = round(width / factor) * factor
        return new_height, new_width
    
    # 需要缩放
    if current_pixels < min_pixels:
        scale = math.sqrt(min_pixels / current_pixels)
    else:
        scale = math.sqrt(max_pixels / current_pixels)
    
    new_height = int(round(height * scale / factor) * factor)
    new_width = int(round(width * scale / factor) * factor)
    
    return new_height, new_width


def pil_to_base64(image: Image.Image) -> str:
    """将 PIL Image 转换为 Base64"""
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def image_to_base64(image_source, config: MobileAgentConfig) -> str:
    """
    将图片转换为 Base64
    
    Args:
        image_source: 图片路径、bytes 或 PIL Image
        config: 配置
        
    Returns:
        data:image/png;base64,... 格式的字符串
    """
    # 加载图片
    if isinstance(image_source, str):
        if image_source.startswith('data:image'):
            # 已经是 Base64
            return image_source
        image = Image.open(image_source)
    elif isinstance(image_source, bytes):
        image = Image.open(BytesIO(image_source))
    elif isinstance(image_source, Image.Image):
        image = image_source
    else:
        raise ValueError(f"Unsupported image source type: {type(image_source)}")
    
    # 调整尺寸
    resized_height, resized_width = smart_resize(
        image.height,
        image.width,
        factor=config.resize_factor,
        min_pixels=config.min_pixels,
        max_pixels=config.max_pixels,
    )
    image = image.resize((resized_width, resized_height))
    
    # 转换为 Base64
    base64_str = pil_to_base64(image)
    return f"data:image/png;base64,{base64_str}"


class MobileAgentClient:
    """
    MobileAgent (GUI-Owl) 客户端
    
    使用 OpenAI 兼容接口调用 ModelScope 上的 GUI-Owl 模型
    """
    
    ERROR_CALLING_LLM = "Error calling LLM"
    RETRY_WAITING_SECONDS = 5
    
    def __init__(self, config: Optional[MobileAgentConfig] = None):
        self.config = config or MobileAgentConfig.from_env()
        self.client = AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url,
            timeout=self.config.timeout,
        )
    
    async def predict(
        self,
        prompt: str,
        images: Optional[List[Any]] = None,
    ) -> Tuple[str, Optional[Any], Optional[Any]]:
        """
        执行预测
        
        Args:
            prompt: 文本提示
            images: 图片列表 (路径、bytes 或 PIL Image)
            
        Returns:
            (response_text, payload, raw_response)
        """
        messages = self._build_messages(prompt, images or [])
        
        counter = self.config.max_retry
        wait_seconds = self.RETRY_WAITING_SECONDS
        
        while counter > 0:
            try:
                response = await self.client.chat.completions.create(
                    model=self.config.model,
                    messages=messages,
                    max_tokens=self.config.max_tokens,
                    temperature=self.config.temperature,
                )
                return (
                    response.choices[0].message.content,
                    messages,
                    response,
                )
            except Exception as e:
                print(f"Error calling MobileAgent LLM: {e}")
                await asyncio.sleep(wait_seconds)
                wait_seconds *= 1.5
                counter -= 1
        
        return self.ERROR_CALLING_LLM, None, None
    
    def _build_messages(
        self,
        prompt: str,
        images: List[Any],
    ) -> List[Dict[str, Any]]:
        """构建消息"""
        content = [{"type": "text", "text": prompt}]
        
        for image in images:
            base64_url = image_to_base64(image, self.config)
            content.append({
                "type": "image_url",
                "image_url": {"url": base64_url}
            })
        
        return [{"role": "user", "content": content}]
    
    def is_available(self) -> bool:
        """检查是否可用"""
        return bool(self.config.api_key)


class MobileAgentProvider(AgentProvider):
    """
    MobileAgent Provider
    
    实现 AgentProvider 接口，封装 MobileAgentClient
    """
    
    def __init__(self, config: Optional[MobileAgentConfig] = None):
        self.config = config or MobileAgentConfig.from_env()
        self.client = MobileAgentClient(self.config)
    
    @property
    def name(self) -> str:
        return "mobile_agent"
    
    @property
    def agent_type(self) -> AgentType:
        return AgentType.MOBILE_AGENT
    
    async def predict(
        self,
        prompt: str,
        screenshots: Optional[List[bytes]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> AgentResponse:
        """执行推理"""
        # 构建完整 prompt
        full_prompt = self.build_prompt(
            prompt,
            page_path=context.get("page_path") if context else None,
            context=context,
        )
        
        # 调用 MobileAgent
        response_text, _, raw_response = await self.client.predict(
            full_prompt,
            images=screenshots or [],
        )
        
        # 检查错误
        if response_text == self.client.ERROR_CALLING_LLM:
            return AgentResponse(
                thinking="",
                action="",
                raw_content="",
                success=False,
                error="Failed to call MobileAgent API",
            )
        
        # 解析响应
        thinking, action = self._parse_response(response_text)
        
        return AgentResponse(
            thinking=thinking,
            action=action,
            raw_content=response_text,
            success=True,
        )
    
    def build_prompt(
        self,
        instruction: str,
        page_path: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        构建 MobileAgent 风格的 Prompt
        
        参考 Mobile-Agent-v3 的 Executor prompt
        """
        prompt = "You are an AI agent operating a restaurant management system (Synapse OS). "
        prompt += "Your goal is to complete the user's instruction by performing actions.\n\n"
        
        prompt += "### User Instruction ###\n"
        prompt += f"{instruction}\n\n"
        
        if page_path:
            prompt += "### Current Page ###\n"
            prompt += f"{page_path}\n\n"
        
        # 添加历史操作
        if context and context.get("action_history"):
            prompt += "### Action History ###\n"
            for i, action in enumerate(context["action_history"][-5:]):
                prompt += f"Step {i+1}: {action}\n"
            prompt += "\n"
        
        prompt += "### Available Actions ###\n"
        prompt += "- Navigate(path): Navigate to a specific page path\n"
        prompt += "- Click(selector): Click on an element by CSS selector or text\n"
        prompt += "- Type(selector, text): Type text into an input field\n"
        prompt += "- APICall(endpoint, method, data): Call an API endpoint\n"
        prompt += "- Scroll(direction): Scroll the page up/down\n"
        prompt += "- Wait(seconds): Wait for a specified duration\n"
        prompt += "- finish(message): Complete the task with a message\n\n"
        
        prompt += "### Output Format ###\n"
        prompt += "Output your response in the following JSON format:\n"
        prompt += '{"action": "<action_type>", "params": {...}, "thinking": "<your reasoning>"}\n\n'
        
        prompt += "Now, decide the next action based on the current screenshot."
        
        return prompt
    
    def _parse_response(self, response: str) -> Tuple[str, str]:
        """解析响应，提取 thinking 和 action"""
        import json
        
        thinking = ""
        action = ""
        
        try:
            # 尝试 JSON 解析
            if '```json' in response:
                json_str = response.split('```json')[-1].split('```')[0].strip()
            elif response.strip().startswith('{'):
                json_str = response.strip()
            else:
                # 尝试提取 ### Thought ### 和 ### Action ### 部分
                if "### Thought" in response:
                    thinking = response.split("### Thought")[-1].split("###")[0].strip()
                if "### Action" in response:
                    action = response.split("### Action")[-1].split("###")[0].strip()
                return thinking, action
            
            data = json.loads(json_str)
            thinking = data.get("thinking", "")
            
            # 构建 action 字符串
            action_type = data.get("action", "")
            params = data.get("params", {})
            if action_type and params:
                action = json.dumps({"action": action_type, **params})
            elif action_type:
                action = json.dumps({"action": action_type})
            
        except (json.JSONDecodeError, Exception):
            # 无法解析，返回原始响应
            thinking = response
            action = response
        
        return thinking, action
    
    def is_available(self) -> bool:
        """检查是否可用"""
        return self.client.is_available()


# 导出
__all__ = [
    "MobileAgentConfig",
    "MobileAgentClient",
    "MobileAgentProvider",
    "smart_resize",
    "image_to_base64",
]
