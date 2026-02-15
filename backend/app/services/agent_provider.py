"""
Agent Provider Abstraction Layer

统一的 Agent 接口，支持 AutoGLM 和 MobileAgent 等多种模型后端。
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from enum import Enum
import json
import re


class AgentType(Enum):
    """Agent 类型"""
    AUTOGLM = "autoglm"
    MOBILE_AGENT = "mobile_agent"
    UI_TARS = "ui_tars"


@dataclass
class AgentResponse:
    """Agent 响应"""
    thinking: str              # 思考过程
    action: str                # 操作指令 (JSON 或特定格式)
    raw_content: str           # 原始响应
    success: bool = True
    error: Optional[str] = None
    
    def get_action_dict(self) -> Optional[Dict[str, Any]]:
        """将 action 解析为字典"""
        try:
            # 尝试从 JSON 解析
            if self.action.startswith('{'):
                return json.loads(self.action)
            
            # 尝试从 do(action=...) 格式解析
            if 'do(action=' in self.action:
                match = re.search(r'do\(action="(\w+)"(?:,\s*(.+))?\)', self.action)
                if match:
                    action_type = match.group(1)
                    params_str = match.group(2) or ""
                    params = {}
                    for param in params_str.split(','):
                        if '=' in param:
                            k, v = param.split('=', 1)
                            params[k.strip()] = v.strip().strip('"\'')
                    return {"action": action_type, **params}
            
            # 尝试从 finish(message=...) 格式解析
            if 'finish(message=' in self.action:
                match = re.search(r'finish\(message="(.+?)"\)', self.action)
                if match:
                    return {"action": "finish", "message": match.group(1)}
            
            return None
        except (json.JSONDecodeError, Exception):
            return None


@dataclass
class ActionResult:
    """操作执行结果"""
    success: bool
    action: Dict[str, Any]
    description: str = ""
    error: Optional[str] = None
    screenshot_before: Optional[bytes] = None
    screenshot_after: Optional[bytes] = None


class AgentProvider(ABC):
    """
    Agent 抽象接口
    
    所有 Agent 实现都需要继承此接口
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Agent 名称"""
        pass
    
    @property
    @abstractmethod
    def agent_type(self) -> AgentType:
        """Agent 类型"""
        pass
    
    @abstractmethod
    async def predict(
        self,
        prompt: str,
        screenshots: Optional[List[bytes]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> AgentResponse:
        """
        执行推理
        
        Args:
            prompt: 用户指令或系统提示
            screenshots: 截图列表 (Base64 或 bytes)
            context: 额外上下文信息
            
        Returns:
            AgentResponse: 包含思考过程和操作指令
        """
        pass
    
    @abstractmethod
    def build_prompt(
        self,
        instruction: str,
        page_path: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        构建 Prompt
        
        Args:
            instruction: 用户指令
            page_path: 当前页面路径
            context: 额外上下文 (历史操作等)
            
        Returns:
            str: 完整的 Prompt
        """
        pass
    
    def is_available(self) -> bool:
        """
        检查 Provider 是否可用
        
        Returns:
            bool: 是否可用
        """
        return True
    
    def parse_action(self, response: str) -> Optional[Dict[str, Any]]:
        """
        解析操作指令
        
        默认实现，子类可以覆盖
        """
        try:
            # 尝试 JSON 解析
            if '```json' in response:
                json_str = response.split('```json')[-1].split('```')[0].strip()
                return json.loads(json_str)
            elif response.strip().startswith('{'):
                return json.loads(response.strip())
            return None
        except json.JSONDecodeError:
            return None


class AgentProviderRegistry:
    """
    Agent Provider 注册表
    
    管理所有可用的 Agent 实现
    """
    
    _providers: Dict[str, AgentProvider] = {}
    _default_provider: Optional[str] = None
    
    @classmethod
    def register(cls, provider: AgentProvider, is_default: bool = False):
        """注册 Agent Provider"""
        cls._providers[provider.name] = provider
        if is_default or cls._default_provider is None:
            cls._default_provider = provider.name
    
    @classmethod
    def get(cls, name: Optional[str] = None) -> Optional[AgentProvider]:
        """获取 Agent Provider"""
        if name is None:
            name = cls._default_provider
        return cls._providers.get(name)
    
    @classmethod
    def get_default(cls) -> Optional[AgentProvider]:
        """获取默认 Agent Provider"""
        return cls.get(cls._default_provider)
    
    @classmethod
    def list_providers(cls) -> List[Dict[str, Any]]:
        """列出所有可用的 Provider"""
        return [
            {
                "name": name,
                "type": provider.agent_type.value,
                "is_default": name == cls._default_provider,
            }
            for name, provider in cls._providers.items()
        ]
    
    @classmethod
    def set_default(cls, name: str):
        """设置默认 Provider"""
        if name in cls._providers:
            cls._default_provider = name


# 导出
__all__ = [
    "AgentType",
    "AgentResponse", 
    "ActionResult",
    "AgentProvider",
    "AgentProviderRegistry",
]
