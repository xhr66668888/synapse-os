"""
Action Executor

定义 AI Agent 可执行的操作类型和协议。
用于后端发送指令给前端执行 DOM 操作。

架构:
    Backend (AI) → WebSocket → Frontend (DOM)
"""

from enum import Enum
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
import uuid


# ============== Action 类型 ==============

class ActionType(str, Enum):
    """可执行的操作类型"""
    
    # 基础交互
    CLICK = "click"              # 点击元素
    DOUBLE_CLICK = "double_click"  # 双击
    RIGHT_CLICK = "right_click"  # 右键点击
    
    # 输入
    TYPE = "type"                # 输入文本
    CLEAR = "clear"              # 清空输入框
    
    # 滚动
    SCROLL = "scroll"            # 滚动页面
    
    # 导航
    NAVIGATE = "navigate"        # 导航到路径
    BACK = "back"                # 后退
    REFRESH = "refresh"          # 刷新
    
    # 等待
    WAIT = "wait"                # 等待
    WAIT_FOR = "wait_for"        # 等待元素出现
    
    # 特殊
    HOVER = "hover"              # 悬停
    DRAG = "drag"                # 拖拽
    SELECT = "select"            # 下拉选择
    
    # 控制
    SCREENSHOT = "screenshot"    # 请求截图
    FINISH = "finish"            # 完成任务


class ClickButton(str, Enum):
    """鼠标按键"""
    LEFT = "left"
    RIGHT = "right"
    MIDDLE = "middle"


class ScrollDirection(str, Enum):
    """滚动方向"""
    UP = "up"
    DOWN = "down"
    LEFT = "left"
    RIGHT = "right"


# ============== Action 参数 ==============

@dataclass
class ClickParams:
    """点击操作参数"""
    # 定位方式 (二选一)
    selector: Optional[str] = None    # CSS 选择器
    text: Optional[str] = None        # 按文本查找
    
    # 坐标定位 (可选，0-1 相对坐标)
    x: Optional[float] = None
    y: Optional[float] = None
    
    # 点击选项
    button: str = "left"
    count: int = 1                    # 点击次数


@dataclass
class TypeParams:
    """输入操作参数"""
    text: str                         # 要输入的文本
    selector: Optional[str] = None    # 目标输入框选择器
    clear_first: bool = False         # 是否先清空
    press_enter: bool = False         # 输入后按回车


@dataclass 
class ScrollParams:
    """滚动操作参数"""
    direction: str = "down"           # up/down/left/right
    amount: int = 300                 # 滚动像素数
    selector: Optional[str] = None    # 在特定元素内滚动
    x: Optional[float] = None         # 滚动位置
    y: Optional[float] = None


@dataclass
class NavigateParams:
    """导航操作参数"""
    path: str                         # 目标路径 (如 /pos, /tables)


@dataclass
class WaitParams:
    """等待操作参数"""
    seconds: float = 1.0              # 等待秒数
    selector: Optional[str] = None    # 等待元素出现


@dataclass
class DragParams:
    """拖拽操作参数"""
    start_x: float                    # 起始 x (0-1)
    start_y: float                    # 起始 y
    end_x: float                      # 结束 x
    end_y: float                      # 结束 y


@dataclass
class FinishParams:
    """完成操作参数"""
    message: str = "任务完成"         # 完成消息
    success: bool = True              # 是否成功


# ============== Action 定义 ==============

@dataclass
class AIAction:
    """
    AI 操作指令
    
    后端 AI 生成此对象，通过 WebSocket 发送给前端执行
    """
    id: str                           # 唯一 ID
    type: ActionType                  # 操作类型
    params: Dict[str, Any]            # 操作参数
    
    # 元数据
    thinking: str = ""                # AI 的思考过程
    timestamp: str = ""               # 创建时间
    timeout: int = 10000              # 超时时间 (ms)
    
    # 上下文
    session_id: Optional[str] = None  # 会话 ID
    step_index: int = 0               # 步骤索引
    
    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())[:8]
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为可序列化字典"""
        return {
            "id": self.id,
            "type": self.type.value if isinstance(self.type, ActionType) else self.type,
            "params": self.params,
            "thinking": self.thinking,
            "timestamp": self.timestamp,
            "timeout": self.timeout,
            "session_id": self.session_id,
            "step_index": self.step_index,
        }
    
    def to_json(self) -> str:
        """转换为 JSON"""
        return json.dumps(self.to_dict(), ensure_ascii=False)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AIAction":
        """从字典创建"""
        return cls(
            id=data.get("id", ""),
            type=ActionType(data["type"]),
            params=data.get("params", {}),
            thinking=data.get("thinking", ""),
            timestamp=data.get("timestamp", ""),
            timeout=data.get("timeout", 10000),
            session_id=data.get("session_id"),
            step_index=data.get("step_index", 0),
        )


# ============== Action 结果 ==============

class ActionStatus(str, Enum):
    """操作执行状态"""
    PENDING = "pending"        # 等待执行
    EXECUTING = "executing"    # 执行中
    SUCCESS = "success"        # 成功
    FAILED = "failed"          # 失败
    TIMEOUT = "timeout"        # 超时
    CANCELLED = "cancelled"    # 已取消


@dataclass
class ActionResult:
    """
    操作执行结果
    
    前端执行完 Action 后返回此结果
    """
    action_id: str                    # 对应的 Action ID
    status: ActionStatus              # 执行状态
    
    # 结果数据
    success: bool = False
    message: str = ""
    error: Optional[str] = None
    
    # 截图 (操作后)
    screenshot: Optional[str] = None  # Base64
    
    # 元素信息 (如果是点击操作)
    element_info: Optional[Dict[str, Any]] = None
    
    # 时间
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_ms: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "action_id": self.action_id,
            "status": self.status.value if isinstance(self.status, ActionStatus) else self.status,
            "success": self.success,
            "message": self.message,
            "error": self.error,
            "screenshot": self.screenshot,
            "element_info": self.element_info,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "duration_ms": self.duration_ms,
        }


# ============== Action 构建器 ==============

class ActionBuilder:
    """
    Action 构建器
    
    方便创建各种类型的 Action
    """
    
    @staticmethod
    def click(
        selector: Optional[str] = None,
        x: Optional[float] = None,
        y: Optional[float] = None,
        text: Optional[str] = None,
        thinking: str = "",
    ) -> AIAction:
        """创建点击操作"""
        params = {}
        if selector:
            params["selector"] = selector
        if text:
            params["text"] = text
        if x is not None and y is not None:
            params["x"] = x
            params["y"] = y
        
        return AIAction(
            id="",
            type=ActionType.CLICK,
            params=params,
            thinking=thinking,
        )
    
    @staticmethod
    def type_text(
        text: str,
        selector: Optional[str] = None,
        clear_first: bool = False,
        press_enter: bool = False,
        thinking: str = "",
    ) -> AIAction:
        """创建输入操作"""
        return AIAction(
            id="",
            type=ActionType.TYPE,
            params={
                "text": text,
                "selector": selector,
                "clear_first": clear_first,
                "press_enter": press_enter,
            },
            thinking=thinking,
        )
    
    @staticmethod
    def scroll(
        direction: str = "down",
        amount: int = 300,
        x: Optional[float] = None,
        y: Optional[float] = None,
        thinking: str = "",
    ) -> AIAction:
        """创建滚动操作"""
        params = {"direction": direction, "amount": amount}
        if x is not None and y is not None:
            params["x"] = x
            params["y"] = y
        
        return AIAction(
            id="",
            type=ActionType.SCROLL,
            params=params,
            thinking=thinking,
        )
    
    @staticmethod
    def navigate(path: str, thinking: str = "") -> AIAction:
        """创建导航操作"""
        return AIAction(
            id="",
            type=ActionType.NAVIGATE,
            params={"path": path},
            thinking=thinking,
        )
    
    @staticmethod
    def wait(seconds: float = 1.0, thinking: str = "") -> AIAction:
        """创建等待操作"""
        return AIAction(
            id="",
            type=ActionType.WAIT,
            params={"seconds": seconds},
            thinking=thinking,
        )
    
    @staticmethod
    def wait_for(selector: str, timeout: int = 5000, thinking: str = "") -> AIAction:
        """创建等待元素操作"""
        return AIAction(
            id="",
            type=ActionType.WAIT_FOR,
            params={"selector": selector, "timeout": timeout},
            thinking=thinking,
        )
    
    @staticmethod
    def screenshot(thinking: str = "") -> AIAction:
        """请求截图"""
        return AIAction(
            id="",
            type=ActionType.SCREENSHOT,
            params={},
            thinking=thinking,
        )
    
    @staticmethod
    def finish(message: str = "任务完成", success: bool = True) -> AIAction:
        """完成任务"""
        return AIAction(
            id="",
            type=ActionType.FINISH,
            params={"message": message, "success": success},
            thinking="任务执行完毕",
        )
    
    @staticmethod
    def drag(
        start_x: float,
        start_y: float,
        end_x: float,
        end_y: float,
        thinking: str = "",
    ) -> AIAction:
        """创建拖拽操作"""
        return AIAction(
            id="",
            type=ActionType.DRAG,
            params={
                "start_x": start_x,
                "start_y": start_y,
                "end_x": end_x,
                "end_y": end_y,
            },
            thinking=thinking,
        )


# ============== UI-TARS Action 转换器 ==============

def convert_ui_tars_to_action(
    parsed_action: Dict[str, Any],
    screen_width: int = 1920,
    screen_height: int = 1080,
) -> AIAction:
    """
    将 UI-TARS 解析结果转换为 AIAction
    
    Args:
        parsed_action: UI-TARS 解析的动作字典
        screen_width: 屏幕宽度
        screen_height: 屏幕高度
        
    Returns:
        AIAction 对象
    """
    action_type = parsed_action.get("action_type", "")
    action_inputs = parsed_action.get("action_inputs", {})
    thought = parsed_action.get("thought", "")
    
    # 映射 action 类型
    type_mapping = {
        "click": ActionType.CLICK,
        "left_double": ActionType.DOUBLE_CLICK,
        "right_single": ActionType.RIGHT_CLICK,
        "type": ActionType.TYPE,
        "scroll": ActionType.SCROLL,
        "drag": ActionType.DRAG,
        "wait": ActionType.WAIT,
        "finished": ActionType.FINISH,
    }
    
    action_enum = type_mapping.get(action_type, ActionType.CLICK)
    params = {}
    
    # 处理坐标
    if "start_box" in action_inputs:
        box_str = action_inputs["start_box"]
        # 解析 "[x1, y1, x2, y2]" 格式
        try:
            if isinstance(box_str, str):
                coords = eval(box_str)
            else:
                coords = box_str
            
            if len(coords) >= 2:
                # 取中心点
                if len(coords) == 4:
                    x = (coords[0] + coords[2]) / 2
                    y = (coords[1] + coords[3]) / 2
                else:
                    x, y = coords[0], coords[1]
                
                params["x"] = x
                params["y"] = y
        except Exception:
            pass
    
    # 处理 end_box (用于拖拽)
    if "end_box" in action_inputs and action_type == "drag":
        box_str = action_inputs["end_box"]
        try:
            if isinstance(box_str, str):
                coords = eval(box_str)
            else:
                coords = box_str
            
            if len(coords) >= 2:
                if len(coords) == 4:
                    end_x = (coords[0] + coords[2]) / 2
                    end_y = (coords[1] + coords[3]) / 2
                else:
                    end_x, end_y = coords[0], coords[1]
                
                params["end_x"] = end_x
                params["end_y"] = end_y
                params["start_x"] = params.pop("x", 0)
                params["start_y"] = params.pop("y", 0)
        except Exception:
            pass
    
    # 处理输入文本
    if "content" in action_inputs:
        params["text"] = action_inputs["content"]
    
    # 处理滚动方向
    if "direction" in action_inputs:
        params["direction"] = action_inputs["direction"]
    
    # 处理完成消息
    if action_type == "finished" and "content" in action_inputs:
        params["message"] = action_inputs["content"]
        params["success"] = True
    
    return AIAction(
        id="",
        type=action_enum,
        params=params,
        thinking=thought,
    )


# ============== 导出 ==============

__all__ = [
    "ActionType",
    "ActionStatus",
    "ClickButton",
    "ScrollDirection",
    "AIAction",
    "ActionResult",
    "ActionBuilder",
    "convert_ui_tars_to_action",
]
