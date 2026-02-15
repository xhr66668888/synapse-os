"""
Notetaker Agent

跨任务记忆 Agent，记录和总结任务执行历史。
基于 MobileAgent-v3 的 Notetaker 角色设计。
"""

import os
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
import hashlib


# ============== 笔记类型 ==============

@dataclass
class TaskNote:
    """任务步骤笔记"""
    step_index: int
    action: str
    action_params: Dict[str, Any]
    result: str
    success: bool
    screenshot_id: Optional[str] = None
    timestamp: str = ""
    duration_ms: int = 0
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_index": self.step_index,
            "action": self.action,
            "action_params": self.action_params,
            "result": self.result,
            "success": self.success,
            "screenshot_id": self.screenshot_id,
            "timestamp": self.timestamp,
            "duration_ms": self.duration_ms,
        }
    
    def to_summary(self) -> str:
        """生成步骤摘要"""
        status = "✓" if self.success else "✗"
        return f"[{status}] Step {self.step_index}: {self.action} → {self.result}"


@dataclass
class TaskMemory:
    """任务记忆"""
    task_id: str
    instruction: str
    notes: List[TaskNote] = field(default_factory=list)
    started_at: str = ""
    completed_at: Optional[str] = None
    final_status: str = "in_progress"  # in_progress, success, failed
    summary: str = ""
    
    def __post_init__(self):
        if not self.started_at:
            self.started_at = datetime.now().isoformat()
    
    def add_note(self, note: TaskNote):
        """添加笔记"""
        self.notes.append(note)
    
    def complete(self, success: bool, summary: str = ""):
        """完成任务"""
        self.completed_at = datetime.now().isoformat()
        self.final_status = "success" if success else "failed"
        self.summary = summary
    
    @property
    def success_rate(self) -> float:
        """成功率"""
        if not self.notes:
            return 0.0
        success_count = sum(1 for n in self.notes if n.success)
        return success_count / len(self.notes)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "instruction": self.instruction,
            "notes": [n.to_dict() for n in self.notes],
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "final_status": self.final_status,
            "summary": self.summary,
            "success_rate": self.success_rate,
        }
    
    def get_history_context(self, max_steps: int = 5) -> str:
        """获取历史上下文 (用于 AI prompt)"""
        recent = self.notes[-max_steps:] if len(self.notes) > max_steps else self.notes
        lines = [f"任务: {self.instruction}", "执行历史:"]
        for note in recent:
            lines.append(f"  {note.to_summary()}")
        return "\n".join(lines)


# ============== Notetaker Agent ==============

class NotetakerAgent:
    """
    Notetaker Agent
    
    负责记录任务执行历史，跨任务保持记忆，
    为 AI 决策提供上下文信息。
    
    功能:
    - 记录每个步骤的执行情况
    - 生成任务摘要
    - 提供历史上下文
    - 识别相似任务
    """
    
    def __init__(self, max_tasks: int = 100):
        self.max_tasks = max_tasks
        self._tasks: Dict[str, TaskMemory] = {}
        self._task_order: List[str] = []  # 按时间排序的 task_id
        self._instruction_index: Dict[str, List[str]] = {}  # instruction_hash -> [task_ids]
    
    def start_task(self, task_id: str, instruction: str) -> TaskMemory:
        """开始新任务"""
        memory = TaskMemory(task_id=task_id, instruction=instruction)
        self._tasks[task_id] = memory
        self._task_order.append(task_id)
        
        # 建立指令索引
        inst_hash = self._hash_instruction(instruction)
        if inst_hash not in self._instruction_index:
            self._instruction_index[inst_hash] = []
        self._instruction_index[inst_hash].append(task_id)
        
        # 清理旧任务
        self._cleanup_old_tasks()
        
        return memory
    
    def record(
        self,
        task_id: str,
        step_index: int,
        action: str,
        action_params: Dict[str, Any],
        result: str,
        success: bool,
        screenshot_id: Optional[str] = None,
        duration_ms: int = 0,
    ) -> TaskNote:
        """记录任务步骤"""
        if task_id not in self._tasks:
            raise ValueError(f"Task {task_id} not found")
        
        note = TaskNote(
            step_index=step_index,
            action=action,
            action_params=action_params,
            result=result,
            success=success,
            screenshot_id=screenshot_id,
            duration_ms=duration_ms,
        )
        
        self._tasks[task_id].add_note(note)
        return note
    
    def complete_task(
        self,
        task_id: str,
        success: bool,
        summary: str = "",
    ):
        """完成任务"""
        if task_id not in self._tasks:
            raise ValueError(f"Task {task_id} not found")
        
        memory = self._tasks[task_id]
        
        # 如果没有提供摘要，自动生成
        if not summary:
            summary = self._generate_summary(memory)
        
        memory.complete(success, summary)
    
    def get_task(self, task_id: str) -> Optional[TaskMemory]:
        """获取任务记忆"""
        return self._tasks.get(task_id)
    
    def get_context(self, task_id: str, max_steps: int = 5) -> str:
        """获取任务的历史上下文"""
        memory = self._tasks.get(task_id)
        if not memory:
            return ""
        return memory.get_history_context(max_steps)
    
    def find_similar_tasks(
        self,
        instruction: str,
        limit: int = 3,
    ) -> List[TaskMemory]:
        """
        查找相似的历史任务
        
        用于学习之前的成功经验
        """
        inst_hash = self._hash_instruction(instruction)
        
        # 精确匹配
        if inst_hash in self._instruction_index:
            task_ids = self._instruction_index[inst_hash]
            tasks = [self._tasks[id] for id in task_ids if id in self._tasks]
            # 优先返回成功的任务
            tasks.sort(key=lambda t: (t.final_status == "success", t.success_rate), reverse=True)
            return tasks[:limit]
        
        # 模糊匹配 (关键词)
        keywords = self._extract_keywords(instruction)
        similar = []
        
        for task in self._tasks.values():
            task_keywords = self._extract_keywords(task.instruction)
            overlap = len(keywords & task_keywords)
            if overlap > 0:
                similar.append((overlap, task))
        
        similar.sort(key=lambda x: x[0], reverse=True)
        return [t for _, t in similar[:limit]]
    
    def get_success_pattern(self, instruction: str) -> Optional[List[Dict[str, Any]]]:
        """
        获取相似任务的成功模式
        
        返回成功执行过的步骤序列
        """
        similar = self.find_similar_tasks(instruction, limit=1)
        
        for task in similar:
            if task.final_status == "success":
                return [n.to_dict() for n in task.notes]
        
        return None
    
    def summarize_session(self, session_id: str) -> str:
        """生成会话摘要"""
        # 找出属于该会话的所有任务
        session_tasks = [
            t for t in self._tasks.values()
            if t.task_id.startswith(session_id) or session_id in t.task_id
        ]
        
        if not session_tasks:
            return "没有找到相关任务"
        
        total = len(session_tasks)
        success = sum(1 for t in session_tasks if t.final_status == "success")
        failed = sum(1 for t in session_tasks if t.final_status == "failed")
        
        lines = [
            f"会话摘要:",
            f"- 总任务数: {total}",
            f"- 成功: {success}",
            f"- 失败: {failed}",
            "",
            "任务列表:",
        ]
        
        for task in session_tasks:
            status = "✓" if task.final_status == "success" else "✗" if task.final_status == "failed" else "..."
            lines.append(f"  [{status}] {task.instruction}")
        
        return "\n".join(lines)
    
    def _hash_instruction(self, instruction: str) -> str:
        """计算指令哈希 (用于索引)"""
        # 简化指令用于匹配
        normalized = instruction.lower().strip()
        return hashlib.md5(normalized.encode()).hexdigest()[:8]
    
    def _extract_keywords(self, instruction: str) -> set:
        """提取关键词"""
        # 简单的分词
        words = instruction.lower().split()
        # 过滤停用词
        stopwords = {"的", "了", "把", "给", "和", "到", "在", "是", "a", "the", "to", "and"}
        return {w for w in words if w not in stopwords and len(w) > 1}
    
    def _generate_summary(self, memory: TaskMemory) -> str:
        """自动生成任务摘要"""
        total_steps = len(memory.notes)
        success_steps = sum(1 for n in memory.notes if n.success)
        
        actions = [n.action for n in memory.notes]
        unique_actions = list(dict.fromkeys(actions))  # 保持顺序去重
        
        return f"执行了 {total_steps} 步操作 ({success_steps} 成功): {' → '.join(unique_actions[:5])}"
    
    def _cleanup_old_tasks(self):
        """清理旧任务"""
        while len(self._task_order) > self.max_tasks:
            old_id = self._task_order.pop(0)
            if old_id in self._tasks:
                del self._tasks[old_id]
    
    def export(self) -> Dict[str, Any]:
        """导出所有记忆"""
        return {
            "tasks": {id: t.to_dict() for id, t in self._tasks.items()},
            "task_order": self._task_order,
        }
    
    def import_data(self, data: Dict[str, Any]):
        """导入记忆"""
        for task_id, task_data in data.get("tasks", {}).items():
            memory = TaskMemory(
                task_id=task_data["task_id"],
                instruction=task_data["instruction"],
                started_at=task_data["started_at"],
                completed_at=task_data.get("completed_at"),
                final_status=task_data.get("final_status", "in_progress"),
                summary=task_data.get("summary", ""),
            )
            for note_data in task_data.get("notes", []):
                note = TaskNote(**note_data)
                memory.notes.append(note)
            self._tasks[task_id] = memory
        
        self._task_order = data.get("task_order", list(self._tasks.keys()))


# ============== 全局实例 ==============

_notetaker: Optional[NotetakerAgent] = None


def get_notetaker() -> NotetakerAgent:
    """获取全局 Notetaker 实例"""
    global _notetaker
    if _notetaker is None:
        _notetaker = NotetakerAgent()
    return _notetaker


# ============== 导出 ==============

__all__ = [
    "TaskNote",
    "TaskMemory",
    "NotetakerAgent",
    "get_notetaker",
]
