"""
Multi-Agent Coordinator

协调 Manager/Executor/Reflector 的执行流程，参考 MobileAgent-v3 架构。
实现多步骤任务的规划、执行、反思和记录。
"""

import asyncio
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Callable, Awaitable
from enum import Enum
from datetime import datetime

from app.services.agent_provider import AgentProvider, AgentResponse
from app.services.task_decomposer import SubTask, TaskStatus


class ActionOutcome(Enum):
    """操作结果"""
    SUCCESS = "A"           # 成功或部分成功
    WRONG_PAGE = "B"        # 进入错误页面，需要返回
    NO_CHANGE = "C"         # 操作无效果
    UNKNOWN = "unknown"


@dataclass
class InfoPool:
    """
    信息池 (参考 MobileAgent)
    
    在多步骤任务执行中共享状态
    """
    # 用户指令
    instruction: str = ""
    task_name: str = ""
    
    # 任务规划
    plan: str = ""
    completed_plan: str = ""
    current_subgoal: str = ""
    progress_status: str = ""
    
    # 历史记录
    action_history: List[Dict[str, Any]] = field(default_factory=list)
    action_outcomes: List[str] = field(default_factory=list)
    error_descriptions: List[str] = field(default_factory=list)
    summary_history: List[str] = field(default_factory=list)
    
    # 重要笔记 (跨任务记忆)
    important_notes: str = ""
    
    # 最近操作
    last_action: str = ""
    last_summary: str = ""
    last_action_thought: str = ""
    
    # 错误恢复
    error_flag_plan: bool = False
    err_to_manager_thresh: int = 2  # 连续失败阈值
    
    # 未来任务
    future_tasks: List[SubTask] = field(default_factory=list)
    
    def add_action(
        self,
        action: Dict[str, Any],
        summary: str,
        outcome: ActionOutcome,
        error_description: str = "",
    ):
        """添加操作记录"""
        self.action_history.append(action)
        self.summary_history.append(summary)
        self.action_outcomes.append(outcome.value)
        self.error_descriptions.append(error_description)
        
        self.last_action = str(action)
        self.last_summary = summary
    
    def get_recent_failures(self) -> int:
        """获取最近连续失败次数"""
        count = 0
        for outcome in reversed(self.action_outcomes):
            if outcome != ActionOutcome.SUCCESS.value:
                count += 1
            else:
                break
        return count
    
    def should_escalate(self) -> bool:
        """是否需要升级到 Manager 重新规划"""
        return self.get_recent_failures() >= self.err_to_manager_thresh


@dataclass
class ExecutionResult:
    """执行结果"""
    success: bool
    message: str
    steps_executed: int = 0
    final_state: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@dataclass
class StepResult:
    """单步执行结果"""
    action: Dict[str, Any]
    outcome: ActionOutcome
    thinking: str = ""
    description: str = ""
    error_description: str = ""
    is_finished: bool = False


class ManagerRole:
    """
    Manager 角色
    
    负责任务规划和进度跟踪
    """
    
    def __init__(self, provider: AgentProvider):
        self.provider = provider
    
    def build_prompt(self, info_pool: InfoPool, first_time: bool = False) -> str:
        """构建 Manager prompt"""
        prompt = "You are a planning agent for a restaurant management system. "
        prompt += "Your goal is to devise high-level plans to achieve the user's requests.\n\n"
        
        prompt += "### User Request ###\n"
        prompt += f"{info_pool.instruction}\n\n"
        
        if first_time:
            prompt += "---\n"
            prompt += "Make a high-level plan to achieve the user's request. "
            prompt += "If the request is complex, break it down into subgoals.\n\n"
            
            prompt += "### Output Format ###\n"
            prompt += "### Thought ###\n"
            prompt += "Your rationale for the plan.\n\n"
            prompt += "### Plan ###\n"
            prompt += "1. first subgoal\n"
            prompt += "2. second subgoal\n"
            prompt += "...\n"
        else:
            if info_pool.completed_plan:
                prompt += "### Completed Operations ###\n"
                prompt += f"{info_pool.completed_plan}\n\n"
            
            prompt += "### Current Plan ###\n"
            prompt += f"{info_pool.plan}\n\n"
            
            prompt += "### Last Action ###\n"
            prompt += f"{info_pool.last_action}\n\n"
            
            prompt += "### Last Action Description ###\n"
            prompt += f"{info_pool.last_summary}\n\n"
            
            if info_pool.important_notes:
                prompt += "### Important Notes ###\n"
                prompt += f"{info_pool.important_notes}\n\n"
            
            if info_pool.should_escalate():
                prompt += "### Warning: Stuck! ###\n"
                prompt += "You have encountered several failed attempts. "
                prompt += "Consider revising the plan.\n\n"
            
            prompt += "---\n"
            prompt += "Assess if the current plan needs revision. "
            prompt += "If the task is complete, mark the plan as 'Finished'.\n\n"
        
        return prompt
    
    async def plan(
        self,
        info_pool: InfoPool,
        screenshot: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        """生成或更新计划"""
        first_time = not info_pool.plan
        prompt = self.build_prompt(info_pool, first_time)
        
        response = await self.provider.predict(
            prompt,
            screenshots=[screenshot] if screenshot else None,
        )
        
        return self._parse_response(response.raw_content)
    
    def _parse_response(self, response: str) -> Dict[str, Any]:
        """解析 Manager 响应"""
        thought = ""
        completed = ""
        plan = ""
        is_finished = False
        
        if "### Thought" in response:
            thought = response.split("### Thought")[-1].split("###")[0].strip()
        
        if "### Historical Operations" in response or "### Completed" in response:
            if "### Historical Operations" in response:
                completed = response.split("### Historical Operations")[-1].split("###")[0].strip()
            else:
                completed = response.split("### Completed")[-1].split("###")[0].strip()
        
        if "### Plan" in response:
            plan = response.split("### Plan")[-1].split("###")[0].strip()
        
        # 检查是否完成
        is_finished = "finished" in plan.lower() or "complete" in plan.lower()
        
        return {
            "thought": thought,
            "completed_plan": completed,
            "plan": plan,
            "is_finished": is_finished,
        }


class ExecutorRole:
    """
    Executor 角色
    
    负责决定下一步操作
    """
    
    def __init__(self, provider: AgentProvider):
        self.provider = provider
    
    def build_prompt(self, info_pool: InfoPool) -> str:
        """构建 Executor prompt"""
        prompt = "You are an execution agent for a restaurant management system. "
        prompt += "Your goal is to decide the next action based on the current state.\n\n"
        
        prompt += "### User Request ###\n"
        prompt += f"{info_pool.instruction}\n\n"
        
        prompt += "### Overall Plan ###\n"
        prompt += f"{info_pool.plan}\n\n"
        
        prompt += "### Current Subgoal ###\n"
        prompt += f"{info_pool.current_subgoal or 'Complete the first item in the plan'}\n\n"
        
        if info_pool.progress_status:
            prompt += "### Progress Status ###\n"
            prompt += f"{info_pool.progress_status}\n\n"
        
        # 最近操作历史
        if info_pool.action_history:
            prompt += "### Recent Actions ###\n"
            num_actions = min(5, len(info_pool.action_history))
            for i in range(-num_actions, 0):
                action = info_pool.action_history[i]
                summary = info_pool.summary_history[i]
                outcome = info_pool.action_outcomes[i]
                outcome_str = "Successful" if outcome == "A" else "Failed"
                prompt += f"- {summary}: {outcome_str}\n"
            prompt += "\n"
        
        prompt += "### Available Actions ###\n"
        prompt += "- Navigate(path): Go to a page\n"
        prompt += "- Click(selector): Click an element\n"
        prompt += "- Type(selector, text): Enter text\n"
        prompt += "- APICall(endpoint, method, data): Call API\n"
        prompt += "- Scroll(direction): Scroll page\n"
        prompt += "- Wait(seconds): Pause\n"
        prompt += "- finish(message): Complete task\n\n"
        
        prompt += "### Output Format ###\n"
        prompt += "### Thought ###\n"
        prompt += "Your reasoning for the chosen action.\n\n"
        prompt += "### Action ###\n"
        prompt += '{"action": "<type>", "params": {...}}\n\n'
        prompt += "### Description ###\n"
        prompt += "Brief description of the action.\n"
        
        return prompt
    
    async def execute(
        self,
        info_pool: InfoPool,
        screenshot: Optional[bytes] = None,
    ) -> StepResult:
        """决定下一步操作"""
        prompt = self.build_prompt(info_pool)
        
        response = await self.provider.predict(
            prompt,
            screenshots=[screenshot] if screenshot else None,
        )
        
        return self._parse_response(response.raw_content)
    
    def _parse_response(self, response: str) -> StepResult:
        """解析 Executor 响应"""
        import json
        
        thought = ""
        action = {}
        description = ""
        is_finished = False
        
        if "### Thought" in response:
            thought = response.split("### Thought")[-1].split("###")[0].strip()
        
        if "### Action" in response:
            action_str = response.split("### Action")[-1].split("###")[0].strip()
            try:
                # 提取 JSON
                if action_str.startswith('{'):
                    action = json.loads(action_str)
                elif '{' in action_str:
                    json_str = action_str[action_str.index('{'):action_str.rindex('}')+1]
                    action = json.loads(json_str)
            except json.JSONDecodeError:
                action = {"action": "unknown", "raw": action_str}
        
        if "### Description" in response:
            description = response.split("### Description")[-1].split("###")[0].strip()
        
        # 检查是否是 finish 动作
        if action.get("action") == "finish":
            is_finished = True
        
        return StepResult(
            action=action,
            outcome=ActionOutcome.UNKNOWN,
            thinking=thought,
            description=description,
            is_finished=is_finished,
        )


class ReflectorRole:
    """
    Reflector 角色
    
    负责验证操作结果
    """
    
    def __init__(self, provider: AgentProvider):
        self.provider = provider
    
    def build_prompt(
        self,
        info_pool: InfoPool,
        last_action: Dict[str, Any],
        last_description: str,
    ) -> str:
        """构建 Reflector prompt"""
        prompt = "You are a reflection agent. "
        prompt += "Your goal is to verify whether the last action produced the expected result.\n\n"
        
        prompt += "### User Request ###\n"
        prompt += f"{info_pool.instruction}\n\n"
        
        prompt += "### Last Action ###\n"
        prompt += f"Action: {last_action}\n"
        prompt += f"Expected: {last_description}\n\n"
        
        prompt += "### Progress Status ###\n"
        prompt += f"{info_pool.progress_status or 'No progress yet'}\n\n"
        
        prompt += "---\n"
        prompt += "Examine the two screenshots (before and after the action) "
        prompt += "to determine if the action was successful.\n\n"
        
        prompt += "### Output Format ###\n"
        prompt += "### Outcome ###\n"
        prompt += "Choose one:\n"
        prompt += "A: Successful - action achieved expected result\n"
        prompt += "B: Failed - wrong page, need to go back\n"
        prompt += "C: Failed - no changes detected\n\n"
        prompt += "### Error Description ###\n"
        prompt += "If failed, explain why. If successful, write 'None'.\n"
        
        return prompt
    
    async def reflect(
        self,
        info_pool: InfoPool,
        last_action: Dict[str, Any],
        last_description: str,
        before_screenshot: Optional[bytes] = None,
        after_screenshot: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        """验证操作结果"""
        prompt = self.build_prompt(info_pool, last_action, last_description)
        
        screenshots = []
        if before_screenshot:
            screenshots.append(before_screenshot)
        if after_screenshot:
            screenshots.append(after_screenshot)
        
        response = await self.provider.predict(
            prompt,
            screenshots=screenshots if screenshots else None,
        )
        
        return self._parse_response(response.raw_content)
    
    def _parse_response(self, response: str) -> Dict[str, Any]:
        """解析 Reflector 响应"""
        outcome_str = ""
        error_description = ""
        
        if "### Outcome" in response:
            outcome_str = response.split("### Outcome")[-1].split("###")[0].strip()
        
        if "### Error Description" in response:
            error_description = response.split("### Error Description")[-1].strip()
        
        # 解析 outcome
        if "A" in outcome_str[:5]:
            outcome = ActionOutcome.SUCCESS
        elif "B" in outcome_str[:5]:
            outcome = ActionOutcome.WRONG_PAGE
        elif "C" in outcome_str[:5]:
            outcome = ActionOutcome.NO_CHANGE
        else:
            outcome = ActionOutcome.UNKNOWN
        
        return {
            "outcome": outcome,
            "error_description": error_description if outcome != ActionOutcome.SUCCESS else "",
        }


class NotetakerRole:
    """
    Notetaker 角色
    
    负责记录重要信息
    """
    
    def __init__(self, provider: AgentProvider):
        self.provider = provider
    
    async def take_notes(
        self,
        info_pool: InfoPool,
        screenshot: Optional[bytes] = None,
    ) -> str:
        """记录重要信息"""
        prompt = "You are a note-taking agent. "
        prompt += "Your goal is to record important information relevant to the task.\n\n"
        
        prompt += "### User Request ###\n"
        prompt += f"{info_pool.instruction}\n\n"
        
        prompt += "### Progress Status ###\n"
        prompt += f"{info_pool.progress_status or 'No progress yet'}\n\n"
        
        prompt += "### Existing Notes ###\n"
        prompt += f"{info_pool.important_notes or 'No notes recorded'}\n\n"
        
        prompt += "---\n"
        prompt += "Identify any important information on the current screen "
        prompt += "that should be recorded for later use.\n\n"
        
        prompt += "### Output Format ###\n"
        prompt += "### Important Notes ###\n"
        prompt += "Updated notes combining old and new information.\n"
        
        response = await self.provider.predict(
            prompt,
            screenshots=[screenshot] if screenshot else None,
        )
        
        # 解析响应
        if "### Important Notes" in response.raw_content:
            return response.raw_content.split("### Important Notes")[-1].strip()
        return info_pool.important_notes


class MultiAgentCoordinator:
    """
    多 Agent 协调器
    
    协调 Manager/Executor/Reflector 的执行流程
    """
    
    def __init__(
        self,
        primary_provider: AgentProvider,
        fallback_provider: Optional[AgentProvider] = None,
        max_steps: int = 25,
        enable_reflection: bool = True,
        enable_notetaker: bool = False,
    ):
        self.primary = primary_provider
        self.fallback = fallback_provider
        self.max_steps = max_steps
        self.enable_reflection = enable_reflection
        self.enable_notetaker = enable_notetaker
        
        # 初始化角色
        self.manager = ManagerRole(primary_provider)
        self.executor = ExecutorRole(primary_provider)
        self.reflector = ReflectorRole(primary_provider) if enable_reflection else None
        self.notetaker = NotetakerRole(primary_provider) if enable_notetaker else None
        
        # 当前使用的 provider
        self._current_provider = primary_provider
    
    async def execute_task(
        self,
        instruction: str,
        get_screenshot: Callable[[], Awaitable[bytes]],
        perform_action: Callable[[Dict[str, Any]], Awaitable[bool]],
    ) -> ExecutionResult:
        """
        执行完整任务
        
        Args:
            instruction: 用户指令
            get_screenshot: 获取截图的回调
            perform_action: 执行操作的回调
            
        Returns:
            ExecutionResult: 执行结果
        """
        info_pool = InfoPool(instruction=instruction)
        steps_executed = 0
        
        for step in range(self.max_steps):
            # 1. 获取当前截图
            screenshot = await get_screenshot()
            
            # 2. Manager: 规划 (首次或需要重新规划时)
            if not info_pool.plan or info_pool.should_escalate():
                plan_result = await self.manager.plan(info_pool, screenshot)
                info_pool.plan = plan_result["plan"]
                info_pool.completed_plan = plan_result.get("completed_plan", "")
                
                if plan_result.get("is_finished"):
                    return ExecutionResult(
                        success=True,
                        message="Task completed",
                        steps_executed=steps_executed,
                    )
            
            # 3. Executor: 决定下一步操作
            step_result = await self.executor.execute(info_pool, screenshot)
            
            if step_result.is_finished:
                return ExecutionResult(
                    success=True,
                    message=step_result.description or "Task completed",
                    steps_executed=steps_executed,
                )
            
            # 4. 执行操作
            before_screenshot = screenshot
            action_success = await perform_action(step_result.action)
            steps_executed += 1
            
            # 5. 获取操作后截图
            after_screenshot = await get_screenshot()
            
            # 6. Reflector: 验证结果
            if self.enable_reflection and self.reflector:
                reflect_result = await self.reflector.reflect(
                    info_pool,
                    step_result.action,
                    step_result.description,
                    before_screenshot,
                    after_screenshot,
                )
                outcome = reflect_result["outcome"]
                error_desc = reflect_result.get("error_description", "")
            else:
                outcome = ActionOutcome.SUCCESS if action_success else ActionOutcome.NO_CHANGE
                error_desc = "" if action_success else "Action failed"
            
            # 7. 更新历史
            info_pool.add_action(
                step_result.action,
                step_result.description,
                outcome,
                error_desc,
            )
            
            # 8. Notetaker: 记录重要信息
            if self.enable_notetaker and self.notetaker:
                info_pool.important_notes = await self.notetaker.take_notes(
                    info_pool, after_screenshot
                )
            
            # 9. 检查是否需要切换到回退模型
            if self.fallback and info_pool.should_escalate():
                await self._switch_to_fallback()
        
        return ExecutionResult(
            success=False,
            message=f"Reached maximum steps ({self.max_steps})",
            steps_executed=steps_executed,
            error="Max steps exceeded",
        )
    
    async def execute_subtask(
        self,
        subtask: SubTask,
        get_screenshot: Callable[[], Awaitable[bytes]],
        perform_action: Callable[[Dict[str, Any]], Awaitable[bool]],
    ) -> ExecutionResult:
        """执行单个子任务"""
        instruction = subtask.to_instruction()
        return await self.execute_task(instruction, get_screenshot, perform_action)
    
    async def _switch_to_fallback(self):
        """切换到回退模型"""
        if self.fallback and self._current_provider != self.fallback:
            print("Switching to fallback provider...")
            self._current_provider = self.fallback
            self.manager = ManagerRole(self.fallback)
            self.executor = ExecutorRole(self.fallback)
            if self.enable_reflection:
                self.reflector = ReflectorRole(self.fallback)
            if self.enable_notetaker:
                self.notetaker = NotetakerRole(self.fallback)


# 导出
__all__ = [
    "ActionOutcome",
    "InfoPool",
    "ExecutionResult",
    "StepResult",
    "ManagerRole",
    "ExecutorRole",
    "ReflectorRole",
    "NotetakerRole",
    "MultiAgentCoordinator",
]
