"""智谱 AI API 客户端 - 用于调用 AutoGLM 模型"""

import os
import base64
from dataclasses import dataclass, field
from typing import Any, Optional, List, Dict
from openai import AsyncOpenAI


@dataclass
class ZhipuConfig:
    """智谱 API 配置"""
    api_key: str = field(default_factory=lambda: os.getenv("ZHIPU_API_KEY", ""))
    base_url: str = "https://open.bigmodel.cn/api/paas/v4"
    model: str = field(default_factory=lambda: os.getenv("ZHIPU_MODEL", "autoglm-phone"))
    max_tokens: int = 3000
    temperature: float = 0.1
    top_p: float = 0.85
    frequency_penalty: float = 0.2


@dataclass
class ZhipuResponse:
    """智谱 API 响应"""
    thinking: str
    action: str
    raw_content: str
    success: bool = True
    error: Optional[str] = None


class ZhipuClient:
    """
    智谱 AI 客户端
    
    使用 OpenAI 兼容接口调用智谱 AutoGLM 模型
    """
    
    def __init__(self, config: Optional[ZhipuConfig] = None):
        self.config = config or ZhipuConfig()
        self.client = AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url
        )
    
    async def chat(
        self,
        messages: List[Dict[str, Any]],
        stream: bool = False
    ) -> ZhipuResponse:
        """
        发送聊天请求
        
        Args:
            messages: OpenAI 格式的消息列表
            stream: 是否使用流式响应
            
        Returns:
            ZhipuResponse 包含思考过程和操作指令
        """
        try:
            if stream:
                return await self._chat_stream(messages)
            else:
                return await self._chat_complete(messages)
        except Exception as e:
            return ZhipuResponse(
                thinking="",
                action="",
                raw_content="",
                success=False,
                error=str(e)
            )
    
    async def _chat_complete(self, messages: List[Dict[str, Any]]) -> ZhipuResponse:
        """非流式请求"""
        response = await self.client.chat.completions.create(
            model=self.config.model,
            messages=messages,
            max_tokens=self.config.max_tokens,
            temperature=self.config.temperature,
            top_p=self.config.top_p,
            frequency_penalty=self.config.frequency_penalty,
        )
        
        raw_content = response.choices[0].message.content or ""
        thinking, action = self._parse_response(raw_content)
        
        return ZhipuResponse(
            thinking=thinking,
            action=action,
            raw_content=raw_content
        )
    
    async def _chat_stream(self, messages: List[Dict[str, Any]]) -> ZhipuResponse:
        """流式请求"""
        stream = await self.client.chat.completions.create(
            model=self.config.model,
            messages=messages,
            max_tokens=self.config.max_tokens,
            temperature=self.config.temperature,
            top_p=self.config.top_p,
            frequency_penalty=self.config.frequency_penalty,
            stream=True,
        )
        
        raw_content = ""
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                raw_content += chunk.choices[0].delta.content
        
        thinking, action = self._parse_response(raw_content)
        
        return ZhipuResponse(
            thinking=thinking,
            action=action,
            raw_content=raw_content
        )
    
    def _parse_response(self, content: str) -> tuple[str, str]:
        """
        解析模型响应，提取思考过程和操作指令
        
        解析规则:
        1. 如果包含 'finish(message=' -> 之前是思考，之后是操作
        2. 如果包含 'do(action=' -> 之前是思考，之后是操作
        3. 如果包含 '<answer>' -> 使用 XML 标签解析
        4. 否则整个内容作为操作
        """
        # 规则 1: finish(message=
        if "finish(message=" in content:
            parts = content.split("finish(message=", 1)
            thinking = parts[0].strip()
            action = "finish(message=" + parts[1]
            return thinking, action
        
        # 规则 2: do(action=
        if "do(action=" in content:
            parts = content.split("do(action=", 1)
            thinking = parts[0].strip()
            action = "do(action=" + parts[1]
            return thinking, action
        
        # 规则 3: XML 标签
        if "<answer>" in content:
            parts = content.split("<answer>", 1)
            thinking = parts[0].replace("<think>", "").replace("</think>", "").strip()
            action = parts[1].replace("</answer>", "").strip()
            return thinking, action
        
        # 规则 4: 默认
        return "", content
    
    @staticmethod
    def create_system_message(content: str) -> Dict[str, Any]:
        """创建系统消息"""
        return {"role": "system", "content": content}
    
    @staticmethod
    def create_user_message(
        text: str,
        image_base64: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        创建用户消息（支持图片）
        
        Args:
            text: 文本内容
            image_base64: Base64 编码的图片（可选）
        """
        content = []
        
        if image_base64:
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{image_base64}"}
            })
        
        content.append({"type": "text", "text": text})
        
        return {"role": "user", "content": content}
    
    @staticmethod
    def create_assistant_message(content: str) -> Dict[str, Any]:
        """创建助手消息"""
        return {"role": "assistant", "content": content}
