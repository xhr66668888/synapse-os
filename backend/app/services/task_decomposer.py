"""
Task Decomposer

将复合指令分解为可执行的子任务序列。
支持识别菜品操作、桌位操作、订单操作、查询等多种任务类型。

示例:
    输入: "下架宫保鸡丁，给3桌结账，今天卖了多少钱"
    输出: [
        SubTask(1, MENU_ACTION, "下架", "宫保鸡丁"),
        SubTask(2, TABLE_ACTION, "结账", "3"),
        SubTask(3, QUERY, "查询", "今日销售额")
    ]
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple
from enum import Enum


class TaskType(Enum):
    """任务类型"""
    MENU_ACTION = "menu_action"      # 菜品操作: 上架/下架/改价
    TABLE_ACTION = "table_action"    # 桌位操作: 开桌/结账/换桌/清台
    ORDER_ACTION = "order_action"    # 订单操作: 加菜/减菜/取消
    QUERY = "query"                  # 查询操作: 销售额/库存
    ROBOT_ACTION = "robot_action"    # 机器人操作: 推送订单
    STAFF_ACTION = "staff_action"    # 员工操作: 排班/考勤
    NAVIGATION = "navigation"        # 导航操作: 打开页面
    GENERAL = "general"              # 通用指令


class TaskStatus(Enum):
    """任务状态"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class SubTask:
    """子任务"""
    id: int
    type: TaskType
    action: str                      # 动作: 下架/结账/查询...
    target: str                      # 目标: 宫保鸡丁/3桌...
    raw_text: str = ""               # 原始文本
    parameters: Dict[str, Any] = field(default_factory=dict)
    dependencies: List[int] = field(default_factory=list)  # 依赖的任务 ID
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    
    def to_instruction(self) -> str:
        """转换为可执行指令"""
        if self.type == TaskType.MENU_ACTION:
            return f"在菜单管理页面，{self.action}菜品「{self.target}」"
        elif self.type == TaskType.TABLE_ACTION:
            return f"在桌位页面，给 {self.target} 号桌{self.action}"
        elif self.type == TaskType.ORDER_ACTION:
            return f"在订单页面，{self.action}：{self.target}"
        elif self.type == TaskType.QUERY:
            return f"查询{self.target}"
        elif self.type == TaskType.ROBOT_ACTION:
            return f"在炒菜机器人页面，{self.action}「{self.target}」"
        elif self.type == TaskType.NAVIGATION:
            return f"导航到{self.target}页面"
        else:
            return self.raw_text or f"{self.action} {self.target}"
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "type": self.type.value,
            "action": self.action,
            "target": self.target,
            "raw_text": self.raw_text,
            "parameters": self.parameters,
            "dependencies": self.dependencies,
            "status": self.status.value,
            "result": self.result,
            "error": self.error,
        }


# 任务模式匹配规则
TASK_PATTERNS: Dict[TaskType, List[Tuple[str, List[str]]]] = {
    TaskType.MENU_ACTION: [
        # (pattern, [action_group, target_group])
        (r"(下架|上架|隐藏|显示)\s*[「」《》''""]*([^，,。；;、]+?)[」》''""]*(?:[，,。；;]|$)", ["action", "target"]),
        (r"把\s*[「」''""]*([^，,。；;]+?)[」''""]*\s*(下架|上架|隐藏|显示)", ["target", "action"]),
        (r"(修改|更新|设置)\s*[「」''""]*([^，,。；;]+?)[」''""]*\s*(?:的)?价格", ["action", "target"]),
        (r"[「」''""]*([^，,。；;]+?)[」''""]*\s*(涨价|降价|改价)", ["target", "action"]),
    ],
    TaskType.TABLE_ACTION: [
        (r"(?:给|帮)?\s*(\d+)\s*[号桌台]\s*(开桌|结账|换桌|清台|收台|买单)", ["target", "action"]),
        (r"(开桌|结账|换桌|清台|收台|买单)\s*(?:给|到)?\s*(\d+)\s*[号桌台]?", ["action", "target"]),
        (r"(\d+)\s*[号桌台]?\s*(开桌|结账|换桌|清台|收台|买单)", ["target", "action"]),
    ],
    TaskType.ORDER_ACTION: [
        (r"(?:给|帮)?\s*(\d+)\s*[号桌台]\s*(加菜|减菜|催单|取消订单)", ["target", "action"]),
        (r"(加菜|减菜|催单|取消订单)\s*(?:给|到)?\s*(\d+)\s*[号桌台]?", ["action", "target"]),
        (r"(取消|删除)\s*订单\s*[#号]?\s*(\w+)", ["action", "target"]),
    ],
    TaskType.QUERY: [
        (r"(今天|今日|本月|昨天|上周|这周)[\s的]*(销售额|营业额|收入|订单数|流水)", ["time", "target"]),
        (r"(查询|看看|显示|告诉我)\s*(.+?)(?:[，,。；;]|$)", ["action", "target"]),
        (r"(.+?)\s*(是多少|有多少|多少钱)", ["target", "action"]),
    ],
    TaskType.ROBOT_ACTION: [
        (r"(?:让|叫)?机器人\s*(炒|做|制作)\s*[「」''""]*([^，,。；;]+)", ["action", "target"]),
        (r"(推送|发送)\s*(?:订单)?\s*(?:给|到)?\s*(?:炒菜)?机器人", ["action", "target"]),
        (r"[「」''""]*([^，,。；;]+?)[」''""]*\s*(推送|发送)(?:给|到)?机器人", ["target", "action"]),
    ],
    TaskType.STAFF_ACTION: [
        (r"(排班|调班|请假|考勤)\s*[：:]\s*(.+)", ["action", "target"]),
        (r"给?\s*(.+?)\s*(排班|调班|请假)", ["target", "action"]),
    ],
    TaskType.NAVIGATION: [
        (r"(打开|进入|跳转到?|去)\s*(.+?)(?:页面|页|界面)?(?:[，,。；;]|$)", ["action", "target"]),
        (r"(显示|查看)\s*(.+?)(?:页面|页|界面)", ["action", "target"]),
    ],
}


class TaskDecomposer:
    """
    任务分解器
    
    将复合指令拆解为子任务序列，支持：
    - 多任务识别和分割
    - 任务类型自动分类
    - 依赖关系分析
    """
    
    # 分隔符
    SEPARATORS = r'[，,。；;、\n]+'
    
    def __init__(self):
        self.patterns = TASK_PATTERNS
    
    async def decompose(self, command: str) -> List[SubTask]:
        """
        分解复合指令
        
        Args:
            command: 用户输入的复合指令
            
        Returns:
            List[SubTask]: 子任务列表
        """
        # 1. 预处理
        command = self._preprocess(command)
        
        # 2. 尝试整体匹配 (优先)
        tasks = self._match_patterns(command)
        
        # 3. 如果没有匹配，按分隔符分割后再匹配
        if not tasks:
            segments = re.split(self.SEPARATORS, command)
            for segment in segments:
                segment = segment.strip()
                if segment:
                    segment_tasks = self._match_patterns(segment)
                    if segment_tasks:
                        tasks.extend(segment_tasks)
                    elif len(segment) > 2:  # 忽略太短的片段
                        # 作为通用任务
                        tasks.append(SubTask(
                            id=0,  # 后面重新编号
                            type=TaskType.GENERAL,
                            action="execute",
                            target=segment,
                            raw_text=segment,
                        ))
        
        # 4. 重新编号
        for i, task in enumerate(tasks):
            task.id = i + 1
        
        # 5. 分析依赖关系
        tasks = self._resolve_dependencies(tasks)
        
        return tasks
    
    def _preprocess(self, command: str) -> str:
        """预处理命令"""
        # 去除多余空格
        command = re.sub(r'\s+', ' ', command.strip())
        # 统一标点符号
        command = command.replace('，', ',').replace('。', '.').replace('；', ';')
        return command
    
    def _match_patterns(self, text: str) -> List[SubTask]:
        """在文本中匹配任务模式"""
        tasks = []
        matched_spans = []
        
        for task_type, patterns in self.patterns.items():
            for pattern, groups in patterns:
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    # 检查是否已被匹配
                    span = match.span()
                    if any(self._spans_overlap(span, ms) for ms in matched_spans):
                        continue
                    
                    matched_spans.append(span)
                    
                    # 提取 action 和 target
                    action = ""
                    target = ""
                    for i, group_name in enumerate(groups):
                        value = match.group(i + 1) if i + 1 <= len(match.groups()) else ""
                        if group_name == "action":
                            action = value.strip() if value else ""
                        elif group_name == "target":
                            target = value.strip() if value else ""
                        elif group_name == "time":
                            # 时间作为参数
                            target = value.strip() if value else ""
                    
                    tasks.append(SubTask(
                        id=0,
                        type=task_type,
                        action=action,
                        target=target,
                        raw_text=match.group(0).strip(),
                    ))
        
        return tasks
    
    def _spans_overlap(self, span1: Tuple[int, int], span2: Tuple[int, int]) -> bool:
        """检查两个 span 是否重叠"""
        return not (span1[1] <= span2[0] or span2[1] <= span1[0])
    
    def _resolve_dependencies(self, tasks: List[SubTask]) -> List[SubTask]:
        """
        分析任务依赖关系
        
        规则：
        - 同一桌位的操作有依赖 (如先开桌后加菜)
        - 查询类任务通常无依赖
        """
        # 按桌位分组
        table_tasks: Dict[str, List[int]] = {}
        
        for task in tasks:
            if task.type in [TaskType.TABLE_ACTION, TaskType.ORDER_ACTION]:
                table_id = task.target
                if table_id not in table_tasks:
                    table_tasks[table_id] = []
                table_tasks[table_id].append(task.id)
        
        # 设置依赖：同一桌位的任务依赖前一个任务
        for table_id, task_ids in table_tasks.items():
            for i in range(1, len(task_ids)):
                current_task = next(t for t in tasks if t.id == task_ids[i])
                current_task.dependencies.append(task_ids[i - 1])
        
        return tasks
    
    def get_task_summary(self, tasks: List[SubTask]) -> str:
        """生成任务摘要"""
        if not tasks:
            return "无任务"
        
        lines = [f"共 {len(tasks)} 个子任务："]
        for task in tasks:
            status_icon = {
                TaskStatus.PENDING: "⏳",
                TaskStatus.RUNNING: "🔄",
                TaskStatus.COMPLETED: "✅",
                TaskStatus.FAILED: "❌",
                TaskStatus.SKIPPED: "⏭️",
            }.get(task.status, "❓")
            
            lines.append(f"  {status_icon} [{task.id}] {task.to_instruction()}")
        
        return "\n".join(lines)


# 便捷函数
async def decompose_command(command: str) -> List[SubTask]:
    """分解命令的便捷函数"""
    decomposer = TaskDecomposer()
    return await decomposer.decompose(command)


# 导出
__all__ = [
    "TaskType",
    "TaskStatus",
    "SubTask",
    "TaskDecomposer",
    "decompose_command",
]
