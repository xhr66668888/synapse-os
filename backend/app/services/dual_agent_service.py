"""
Dual Agent Service

双模型协调服务，智能路由任务到最合适的模型。
支持 AutoGLM 和 MobileAgent 的协同工作。
"""

import os
from dataclasses import dataclass
from typing import Optional, List, Dict, Any, Callable, Awaitable
from enum import Enum

from app.services.agent_provider import (
    AgentProvider,
    AgentProviderRegistry,
    AgentResponse,
)
from app.services.autoglm_provider import AutoGLMProvider
from app.services.mobile_agent_client import MobileAgentProvider, MobileAgentConfig
from app.services.task_decomposer import (
    TaskDecomposer,
    SubTask,
    TaskType,
    TaskStatus,
)
from app.services.multi_agent_coordinator import (
    MultiAgentCoordinator,
    ExecutionResult,
    InfoPool,
)


class RoutingStrategy(Enum):
    """路由策略"""
    AUTO = "auto"              # 自动选择
    AUTOGLM_PRIMARY = "autoglm_primary"    # AutoGLM 优先
    MOBILE_AGENT_PRIMARY = "mobile_agent_primary"  # MobileAgent 优先
    AUTOGLM_ONLY = "autoglm_only"          # 仅 AutoGLM
    MOBILE_AGENT_ONLY = "mobile_agent_only"  # 仅 MobileAgent


@dataclass
class DualAgentConfig:
    """双模型配置"""
    default_agent: str = "autoglm"
    routing_strategy: RoutingStrategy = RoutingStrategy.AUTOGLM_PRIMARY
    enable_fallback: bool = True
    enable_reflection: bool = True
    enable_notetaker: bool = False
    max_steps: int = 25
    
    @classmethod
    def from_env(cls) -> "DualAgentConfig":
        """从环境变量加载配置"""
        return cls(
            default_agent=os.getenv("DEFAULT_AGENT", "autoglm"),
            routing_strategy=RoutingStrategy(
                os.getenv("ROUTING_STRATEGY", "autoglm_primary")
            ),
            enable_fallback=os.getenv("ENABLE_FALLBACK", "true").lower() == "true",
            enable_reflection=os.getenv("ENABLE_REFLECTION", "true").lower() == "true",
            enable_notetaker=os.getenv("ENABLE_NOTETAKER", "false").lower() == "true",
            max_steps=int(os.getenv("MAX_EXECUTION_STEPS", "25")),
        )


@dataclass
class MultiTaskResult:
    """多任务执行结果"""
    tasks: List[SubTask]
    results: List[ExecutionResult]
    overall_success: bool
    summary: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "tasks": [t.to_dict() for t in self.tasks],
            "results": [
                {
                    "success": r.success,
                    "message": r.message,
                    "steps_executed": r.steps_executed,
                    "error": r.error,
                }
                for r in self.results
            ],
            "overall_success": self.overall_success,
            "summary": self.summary,
        }


class DualAgentService:
    """
    双模型协调服务
    
    功能:
    1. 任务路由: 根据任务类型选择最佳模型
    2. 回退机制: 主模型失败时切换到备用模型
    3. 多任务执行: 支持复合指令分解和顺序执行
    """
    
    def __init__(self, config: Optional[DualAgentConfig] = None):
        self.config = config or DualAgentConfig.from_env()
        
        # 初始化 Providers
        self.autoglm = AutoGLMProvider()
        self.mobile_agent = MobileAgentProvider()
        
        # 注册到 Registry
        AgentProviderRegistry.register(self.autoglm, is_default=True)
        if self.mobile_agent.is_available():
            AgentProviderRegistry.register(self.mobile_agent)
        
        # 任务分解器
        self.task_decomposer = TaskDecomposer()
        
        # 多 Agent 协调器
        self._coordinator: Optional[MultiAgentCoordinator] = None
    
    def get_coordinator(
        self,
        primary: Optional[AgentProvider] = None,
        fallback: Optional[AgentProvider] = None,
    ) -> MultiAgentCoordinator:
        """获取多 Agent 协调器"""
        primary = primary or self._get_primary_provider()
        if self.config.enable_fallback:
            fallback = fallback or self._get_fallback_provider(primary)
        
        return MultiAgentCoordinator(
            primary_provider=primary,
            fallback_provider=fallback,
            max_steps=self.config.max_steps,
            enable_reflection=self.config.enable_reflection,
            enable_notetaker=self.config.enable_notetaker,
        )
    
    async def route_task(self, task: SubTask) -> AgentProvider:
        """
        根据任务类型选择最佳 Agent
        
        路由规则:
        - DOM 操作 (Click, Type, Navigate): AutoGLM 优先
        - 复杂多步任务: MobileAgent 优先
        - 查询类任务: AutoGLM 优先 (直接 API 调用)
        """
        if self.config.routing_strategy == RoutingStrategy.AUTOGLM_ONLY:
            return self.autoglm
        
        if self.config.routing_strategy == RoutingStrategy.MOBILE_AGENT_ONLY:
            if self.mobile_agent.is_available():
                return self.mobile_agent
            return self.autoglm
        
        # 自动路由
        if self.config.routing_strategy in [RoutingStrategy.AUTO, RoutingStrategy.AUTOGLM_PRIMARY]:
            # 复杂任务使用 MobileAgent
            if task.type in [TaskType.GENERAL] and self.mobile_agent.is_available():
                return self.mobile_agent
            return self.autoglm
        
        # MobileAgent 优先
        if self.config.routing_strategy == RoutingStrategy.MOBILE_AGENT_PRIMARY:
            if self.mobile_agent.is_available():
                return self.mobile_agent
            return self.autoglm
        
        return self.autoglm
    
    async def execute_command(
        self,
        command: str,
        screenshot: Optional[bytes] = None,
        page_path: Optional[str] = None,
        get_screenshot: Optional[Callable[[], Awaitable[bytes]]] = None,
        perform_action: Optional[Callable[[Dict[str, Any]], Awaitable[bool]]] = None,
    ) -> AgentResponse:
        """
        执行单个命令
        
        Args:
            command: 用户指令
            screenshot: 当前截图
            page_path: 当前页面路径
            get_screenshot: 获取截图的回调 (用于多步执行)
            perform_action: 执行操作的回调 (用于多步执行)
            
        Returns:
            AgentResponse: Agent 响应
        """
        # 获取 Provider
        provider = self._get_primary_provider()
        
        # 构建上下文
        context = {"page_path": page_path} if page_path else {}
        
        # 执行推理
        response = await provider.predict(
            command,
            screenshots=[screenshot] if screenshot else None,
            context=context,
        )
        
        return response
    
    async def execute_multi_task(
        self,
        command: str,
        get_screenshot: Callable[[], Awaitable[bytes]],
        perform_action: Callable[[Dict[str, Any]], Awaitable[bool]],
    ) -> MultiTaskResult:
        """
        执行多任务命令
        
        Args:
            command: 复合指令 (如 "下架宫保鸡丁，给3桌结账")
            get_screenshot: 获取截图的回调
            perform_action: 执行操作的回调
            
        Returns:
            MultiTaskResult: 多任务执行结果
        """
        # 1. 分解任务
        tasks = await self.task_decomposer.decompose(command)
        
        if not tasks:
            return MultiTaskResult(
                tasks=[],
                results=[],
                overall_success=False,
                summary="无法识别任务",
            )
        
        # 2. 逐个执行任务
        results: List[ExecutionResult] = []
        
        for task in tasks:
            task.status = TaskStatus.RUNNING
            
            # 获取该任务对应的 Provider
            provider = await self.route_task(task)
            
            # 获取协调器
            coordinator = self.get_coordinator(primary=provider)
            
            # 执行任务
            try:
                result = await coordinator.execute_subtask(
                    task,
                    get_screenshot=get_screenshot,
                    perform_action=perform_action,
                )
                
                task.status = TaskStatus.COMPLETED if result.success else TaskStatus.FAILED
                task.result = {"message": result.message}
                task.error = result.error
                
            except Exception as e:
                result = ExecutionResult(
                    success=False,
                    message=f"Task execution failed: {str(e)}",
                    error=str(e),
                )
                task.status = TaskStatus.FAILED
                task.error = str(e)
            
            results.append(result)
            
            # 如果任务失败且有依赖它的后续任务，标记为跳过
            if not result.success:
                for other_task in tasks:
                    if task.id in other_task.dependencies:
                        other_task.status = TaskStatus.SKIPPED
        
        # 3. 生成摘要
        overall_success = all(r.success for r in results)
        summary = self.task_decomposer.get_task_summary(tasks)
        
        return MultiTaskResult(
            tasks=tasks,
            results=results,
            overall_success=overall_success,
            summary=summary,
        )
    
    async def execute_with_fallback(
        self,
        command: str,
        screenshot: Optional[bytes] = None,
        page_path: Optional[str] = None,
    ) -> AgentResponse:
        """
        执行命令，失败时回退到备用模型
        
        Args:
            command: 用户指令
            screenshot: 当前截图
            page_path: 当前页面路径
            
        Returns:
            AgentResponse: Agent 响应
        """
        primary = self._get_primary_provider()
        
        try:
            response = await self.execute_command(
                command,
                screenshot=screenshot,
                page_path=page_path,
            )
            
            if response.success:
                return response
            
        except Exception as e:
            print(f"Primary provider failed: {e}")
        
        # 回退到备用模型
        if self.config.enable_fallback:
            fallback = self._get_fallback_provider(primary)
            if fallback:
                context = {"page_path": page_path} if page_path else {}
                return await fallback.predict(
                    command,
                    screenshots=[screenshot] if screenshot else None,
                    context=context,
                )
        
        return AgentResponse(
            thinking="",
            action="",
            raw_content="",
            success=False,
            error="All providers failed",
        )
    
    def _get_primary_provider(self) -> AgentProvider:
        """获取主要 Provider"""
        if self.config.default_agent == "mobile_agent" and self.mobile_agent.is_available():
            return self.mobile_agent
        return self.autoglm
    
    def _get_fallback_provider(
        self,
        primary: AgentProvider,
    ) -> Optional[AgentProvider]:
        """获取回退 Provider"""
        if not self.config.enable_fallback:
            return None
        
        if primary == self.autoglm and self.mobile_agent.is_available():
            return self.mobile_agent
        elif primary == self.mobile_agent:
            return self.autoglm
        
        return None
    
    def list_providers(self) -> List[Dict[str, Any]]:
        """列出所有可用的 Provider"""
        providers = [
            {
                "name": "autoglm",
                "type": "autoglm",
                "available": self.autoglm.is_available(),
                "is_default": self.config.default_agent == "autoglm",
            },
            {
                "name": "mobile_agent",
                "type": "mobile_agent",
                "available": self.mobile_agent.is_available(),
                "is_default": self.config.default_agent == "mobile_agent",
            },
        ]
        return providers
    
    def set_default_provider(self, name: str) -> bool:
        """设置默认 Provider"""
        if name in ["autoglm", "mobile_agent"]:
            self.config.default_agent = name
            return True
        return False


# 单例
_dual_agent_service: Optional[DualAgentService] = None


def get_dual_agent_service() -> DualAgentService:
    """获取双模型服务单例"""
    global _dual_agent_service
    if _dual_agent_service is None:
        _dual_agent_service = DualAgentService()
    return _dual_agent_service


# 导出
__all__ = [
    "RoutingStrategy",
    "DualAgentConfig",
    "MultiTaskResult",
    "DualAgentService",
    "get_dual_agent_service",
]
