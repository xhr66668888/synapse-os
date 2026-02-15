"""Agent 相关的数据模型"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class ActionType(str, Enum):
    """操作类型"""
    NAVIGATE = "Navigate"
    CLICK = "Click"
    TYPE = "Type"
    SCROLL = "Scroll"
    SELECT = "Select"
    WAIT = "Wait"
    CONFIRM = "Confirm"
    API_CALL = "APICall"
    FINISH = "finish"


class AgentActionSchema(BaseModel):
    """Agent 操作"""
    type: str = Field(..., description="操作类型")
    params: Dict[str, Any] = Field(default_factory=dict, description="操作参数")
    message: Optional[str] = Field(None, description="操作消息")
    requires_confirmation: bool = Field(False, description="是否需要用户确认")


class AgentCommandRequest(BaseModel):
    """Agent 指令请求"""
    command: str = Field(..., description="用户的自然语言指令")
    screenshot: Optional[str] = Field(None, description="当前页面截图（Base64）")
    current_page: str = Field("/", description="当前页面路径")
    session_id: Optional[str] = Field(None, description="会话 ID（用于多轮对话）")


class AgentCommandResponse(BaseModel):
    """Agent 指令响应"""
    success: bool = Field(..., description="是否成功")
    action: Optional[AgentActionSchema] = Field(None, description="下一步操作")
    thinking: str = Field("", description="Agent 的思考过程")
    message: Optional[str] = Field(None, description="消息")
    finished: bool = Field(False, description="任务是否完成")
    session_id: str = Field(..., description="会话 ID")
    step_count: int = Field(0, description="当前步数")


class TranscribeRequest(BaseModel):
    """语音转写请求"""
    audio_base64: str = Field(..., description="音频数据（Base64 编码）")
    language: str = Field("zh", description="语言代码 (zh/en/auto)")
    format: str = Field("webm", description="音频格式")


class TranscribeResponse(BaseModel):
    """语音转写响应"""
    success: bool = Field(..., description="是否成功")
    text: str = Field("", description="转写文本")
    language: str = Field("", description="检测到的语言")
    error: Optional[str] = Field(None, description="错误信息")


class AgentSessionInfo(BaseModel):
    """Agent 会话信息"""
    session_id: str
    created_at: str
    step_count: int
    status: str  # active, completed, error
    last_command: Optional[str] = None


# WebSocket 消息类型
class WSMessageType(str, Enum):
    """WebSocket 消息类型"""
    # 客户端发送
    COMMAND = "command"              # 发送指令
    SCREENSHOT = "screenshot"        # 发送截图
    ACTION_RESULT = "action_result"  # 操作执行结果
    CONFIRM_RESPONSE = "confirm"     # 确认响应
    CANCEL = "cancel"                # 取消任务
    
    # 服务端发送
    ACTION = "action"                # 操作指令
    THINKING = "thinking"            # 思考过程
    REQUEST_SCREENSHOT = "request_screenshot"  # 请求截图
    REQUEST_CONFIRM = "request_confirm"  # 请求确认
    FINISHED = "finished"            # 任务完成
    ERROR = "error"                  # 错误


class WSMessage(BaseModel):
    """WebSocket 消息"""
    type: WSMessageType
    data: Dict[str, Any] = Field(default_factory=dict)
    session_id: Optional[str] = None


class WSActionMessage(BaseModel):
    """WebSocket 操作消息"""
    type: str = "action"
    action: AgentActionSchema
    thinking: str = ""
    step: int = 0


class WSFinishedMessage(BaseModel):
    """WebSocket 完成消息"""
    type: str = "finished"
    message: str
    total_steps: int = 0
