"""Web Agent 核心 - 适配 Web 应用的智能 Agent"""

import json
import re
import ast
from dataclasses import dataclass, field
from typing import Any, Optional, List, Dict, Callable
from datetime import datetime

from .zhipu_client import ZhipuClient, ZhipuConfig, ZhipuResponse
from app.config.prompts import get_synapse_system_prompt


@dataclass
class AgentAction:
    """Agent 操作"""
    type: str  # Navigate, Click, Type, Scroll, Select, Wait, Confirm, APICall, finish
    params: Dict[str, Any] = field(default_factory=dict)
    message: Optional[str] = None
    requires_confirmation: bool = False


@dataclass
class AgentStepResult:
    """单步执行结果"""
    success: bool
    finished: bool
    action: Optional[AgentAction]
    thinking: str
    message: Optional[str] = None


@dataclass
class WebAgentConfig:
    """Web Agent 配置"""
    max_steps: int = 50
    lang: str = "cn"
    verbose: bool = True


class ActionParser:
    """操作解析器 - 将模型输出解析为可执行的操作"""
    
    @staticmethod
    def parse(response: str) -> AgentAction:
        """
        解析模型响应为 AgentAction
        
        支持的格式:
        - do(action="Navigate", path="/tables")
        - do(action="Click", selector="#btn", element=[500, 300])
        - do(action="Type", selector="#input", text="hello")
        - do(action="APICall", endpoint="/api/v1/tables", method="POST", data={...})
        - finish(message="任务完成")
        """
        response = response.strip()
        
        try:
            # 处理 Type 操作（可能包含特殊字符）
            if response.startswith('do(action="Type"') or response.startswith("do(action='Type'"):
                return ActionParser._parse_type_action(response)
            
            # 处理 finish 操作
            if response.startswith("finish"):
                return ActionParser._parse_finish_action(response)
            
            # 处理其他 do 操作
            if response.startswith("do"):
                return ActionParser._parse_do_action(response)
            
            # 无法解析，返回完成操作
            return AgentAction(type="finish", message=f"无法解析操作: {response}")
            
        except Exception as e:
            return AgentAction(type="finish", message=f"解析错误: {str(e)}")
    
    @staticmethod
    def _parse_type_action(response: str) -> AgentAction:
        """解析 Type 操作"""
        # 提取 text 参数
        text_match = re.search(r'text=["\'](.+?)["\'](?:\)|,)', response, re.DOTALL)
        selector_match = re.search(r'selector=["\'](.+?)["\']', response)
        
        text = text_match.group(1) if text_match else ""
        selector = selector_match.group(1) if selector_match else ""
        
        return AgentAction(
            type="Type",
            params={"selector": selector, "text": text}
        )
    
    @staticmethod
    def _parse_finish_action(response: str) -> AgentAction:
        """解析 finish 操作"""
        # 提取 message
        match = re.search(r'message=["\'](.+?)["\']', response, re.DOTALL)
        message = match.group(1) if match else "任务完成"
        
        return AgentAction(type="finish", message=message)
    
    @staticmethod
    def _parse_do_action(response: str) -> AgentAction:
        """解析通用 do 操作"""
        # 转义特殊字符以便 AST 解析
        escaped = response.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
        
        try:
            tree = ast.parse(escaped, mode="eval")
            if not isinstance(tree.body, ast.Call):
                raise ValueError("Expected function call")
            
            call = tree.body
            params = {}
            action_type = "Unknown"
            
            for keyword in call.keywords:
                key = keyword.arg
                value = ast.literal_eval(keyword.value)
                if key == "action":
                    action_type = value
                else:
                    params[key] = value
            
            # 检查是否需要确认（敏感操作）
            requires_confirmation = "message" in params and action_type in ["Click", "APICall"]
            
            return AgentAction(
                type=action_type,
                params=params,
                message=params.get("message"),
                requires_confirmation=requires_confirmation
            )
            
        except (SyntaxError, ValueError) as e:
            raise ValueError(f"Failed to parse: {e}")


class WebAgent:
    """
    Web Agent - 适配 Synapse OS 的智能操作代理
    
    基于 AutoGLM 架构，将手机操作适配为 Web DOM 操作
    """
    
    def __init__(
        self,
        zhipu_config: Optional[ZhipuConfig] = None,
        agent_config: Optional[WebAgentConfig] = None,
        confirmation_callback: Optional[Callable[[str], bool]] = None,
    ):
        self.zhipu_client = ZhipuClient(zhipu_config)
        self.config = agent_config or WebAgentConfig()
        self.confirmation_callback = confirmation_callback
        
        self.system_prompt = self._build_system_prompt()
        self.context: List[Dict[str, Any]] = []
        self.step_count = 0
    
    def _build_system_prompt(self) -> str:
        """构建 Synapse OS 专用 system prompt"""
        return get_synapse_system_prompt(self.config.lang)
    
    def reset(self):
        """重置 Agent 状态"""
        self.context = []
        self.step_count = 0
    
    async def process_command(
        self,
        user_command: str,
        screenshot_base64: Optional[str] = None,
        current_page: str = "/"
    ) -> AgentStepResult:
        """
        处理用户指令
        
        Args:
            user_command: 用户的自然语言指令
            screenshot_base64: 当前页面截图（Base64）
            current_page: 当前页面路径
            
        Returns:
            AgentStepResult 包含下一步操作
        """
        self.step_count += 1
        
        # 检查步数限制
        if self.step_count > self.config.max_steps:
            return AgentStepResult(
                success=False,
                finished=True,
                action=None,
                thinking="",
                message="超出最大步数限制"
            )
        
        # 构建消息
        is_first = len(self.context) == 0
        
        if is_first:
            self.context.append(
                ZhipuClient.create_system_message(self.system_prompt)
            )
            
            screen_info = f"当前页面: {current_page}"
            text_content = f"用户指令: {user_command}\n\n{screen_info}"
            
            self.context.append(
                ZhipuClient.create_user_message(text_content, screenshot_base64)
            )
        else:
            screen_info = f"当前页面: {current_page}"
            self.context.append(
                ZhipuClient.create_user_message(screen_info, screenshot_base64)
            )
        
        # 调用模型
        response = await self.zhipu_client.chat(self.context)
        
        if not response.success:
            return AgentStepResult(
                success=False,
                finished=True,
                action=None,
                thinking="",
                message=f"模型调用失败: {response.error}"
            )
        
        # 解析操作
        try:
            action = ActionParser.parse(response.action)
        except Exception as e:
            action = AgentAction(type="finish", message=str(e))
        
        # 添加助手响应到上下文
        self.context.append(
            ZhipuClient.create_assistant_message(
                f"<think>{response.thinking}</think><answer>{response.action}</answer>"
            )
        )
        
        # 移除旧消息中的图片以节省空间
        if len(self.context) > 2:
            self._remove_images_from_old_messages()
        
        # 检查是否完成
        finished = action.type == "finish"
        
        return AgentStepResult(
            success=True,
            finished=finished,
            action=action,
            thinking=response.thinking,
            message=action.message
        )
    
    def _remove_images_from_old_messages(self):
        """移除旧消息中的图片以节省上下文空间"""
        for i, msg in enumerate(self.context[:-1]):  # 保留最新消息的图片
            if isinstance(msg.get("content"), list):
                msg["content"] = [
                    item for item in msg["content"]
                    if item.get("type") == "text"
                ]
    
    async def run(
        self,
        user_command: str,
        get_screenshot: Callable[[], str],
        get_current_page: Callable[[], str],
        execute_action: Callable[[AgentAction], bool]
    ) -> str:
        """
        运行完整的任务循环
        
        Args:
            user_command: 用户指令
            get_screenshot: 获取当前截图的回调
            get_current_page: 获取当前页面路径的回调
            execute_action: 执行操作的回调
            
        Returns:
            任务完成消息
        """
        self.reset()
        
        while self.step_count < self.config.max_steps:
            screenshot = get_screenshot()
            current_page = get_current_page()
            
            result = await self.process_command(
                user_command if self.step_count == 1 else "",
                screenshot,
                current_page
            )
            
            if result.finished:
                return result.message or "任务完成"
            
            if result.action:
                # 检查是否需要确认
                if result.action.requires_confirmation:
                    if self.confirmation_callback:
                        if not self.confirmation_callback(result.action.message or "确认操作?"):
                            return "用户取消操作"
                
                # 执行操作
                success = execute_action(result.action)
                if not success:
                    return f"操作执行失败: {result.action.type}"
        
        return "达到最大步数限制"
