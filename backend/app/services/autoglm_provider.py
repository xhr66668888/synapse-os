"""
AutoGLM Provider

封装现有 ZhipuClient，实现 AgentProvider 接口。
"""

from typing import Optional, List, Dict, Any

from app.services.agent_provider import (
    AgentProvider,
    AgentType,
    AgentResponse,
)
from app.services.zhipu_client import ZhipuClient, ZhipuConfig
from app.config.prompts import get_system_prompt


class AutoGLMProvider(AgentProvider):
    """
    AutoGLM Provider
    
    封装 ZhipuClient，实现统一的 AgentProvider 接口
    """
    
    def __init__(self, config: Optional[ZhipuConfig] = None):
        self.config = config or ZhipuConfig()
        self.client = ZhipuClient(self.config)
    
    @property
    def name(self) -> str:
        return "autoglm"
    
    @property
    def agent_type(self) -> AgentType:
        return AgentType.AUTOGLM
    
    async def predict(
        self,
        prompt: str,
        screenshots: Optional[List[bytes]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> AgentResponse:
        """
        执行推理
        
        Args:
            prompt: 用户指令
            screenshots: 截图列表 (bytes)
            context: 额外上下文 (page_path, action_history 等)
            
        Returns:
            AgentResponse: 包含思考过程和操作指令
        """
        # 构建消息
        messages = self._build_messages(prompt, screenshots, context)
        
        # 调用 ZhipuClient
        response = await self.client.chat(messages)
        
        return AgentResponse(
            thinking=response.thinking,
            action=response.action,
            raw_content=response.raw_content,
            success=response.success,
            error=response.error,
        )
    
    def build_prompt(
        self,
        instruction: str,
        page_path: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        构建 AutoGLM 风格的用户 Prompt
        
        Args:
            instruction: 用户指令
            page_path: 当前页面路径
            context: 额外上下文
            
        Returns:
            str: 完整的用户 Prompt
        """
        parts = []
        
        # 当前页面
        if page_path:
            parts.append(f"当前页面: {page_path}")
        
        # 用户指令
        parts.append(f"用户指令: {instruction}")
        
        # 历史操作
        if context and context.get("action_history"):
            history = context["action_history"][-5:]  # 最近 5 条
            parts.append("最近操作历史:")
            for i, action in enumerate(history):
                parts.append(f"  {i+1}. {action}")
        
        # 额外说明
        if context and context.get("additional_info"):
            parts.append(f"附加信息: {context['additional_info']}")
        
        return "\n".join(parts)
    
    def _build_messages(
        self,
        prompt: str,
        screenshots: Optional[List[bytes]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """构建消息列表"""
        messages = []
        
        # 系统消息
        system_prompt = get_system_prompt(language="zh")
        messages.append(ZhipuClient.create_system_message(system_prompt))
        
        # 添加历史消息 (如果有)
        if context and context.get("message_history"):
            messages.extend(context["message_history"])
        
        # 用户消息 (带截图)
        import base64
        image_base64 = None
        if screenshots:
            # 使用第一张截图
            image_base64 = base64.b64encode(screenshots[0]).decode("utf-8")
        
        user_prompt = self.build_prompt(
            prompt,
            page_path=context.get("page_path") if context else None,
            context=context,
        )
        
        messages.append(ZhipuClient.create_user_message(user_prompt, image_base64))
        
        return messages
    
    def is_available(self) -> bool:
        """检查是否可用"""
        return bool(self.config.api_key)


# 导出
__all__ = ["AutoGLMProvider"]
