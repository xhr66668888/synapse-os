"""
Triple Agent Service

三模型协调服务，智能路由任务到 AutoGLM、MobileAgent 或 UI-TARS。
实现成本优化和性能平衡。
"""

import os
from dataclasses import dataclass
from typing import Optional, List, Dict, Any, Callable, Awaitable
from enum import Enum

from app.services.agent_provider import (
    AgentProvider,
    AgentProviderRegistry,
    AgentResponse,
    AgentType,
)
from app.services.autoglm_provider import AutoGLMProvider
from app.services.mobile_agent_client import MobileAgentProvider
from app.services.ui_tars_client import UITARSProvider
from app.services.task_decomposer import (
    TaskDecomposer,
    SubTask,
    TaskType,
    TaskStatus,
)
from app.services.multi_agent_coordinator import (
    MultiAgentCoordinator,
    ExecutionResult,
)


class RoutingStrategy(Enum):
    """路由策略"""
    COST_OPTIMIZED = "cost_optimized"       # 成本优先 (AutoGLM → MobileAgent → UI-TARS)
    PERFORMANCE_FIRST = "performance_first"  # 性能优先 (UI-TARS → MobileAgent → AutoGLM)
    BALANCED = "balanced"                    # 平衡模式 (根据任务类型智能选择)
    AUTOGLM_ONLY = "autoglm_only"
    MOBILE_AGENT_ONLY = "mobile_agent_only"
    UI_TARS_ONLY = "ui_tars_only"


class TaskComplexity(Enum):
    """任务复杂度"""
    SIMPLE = "simple"       # 单步操作
    MEDIUM = "medium"       # 多步骤
    COMPLEX = "complex"     # 复杂视觉


@dataclass
class TripleAgentConfig:
    """三模型配置"""
    default_agent: str = "autoglm"
    routing_strategy: RoutingStrategy = RoutingStrategy.COST_OPTIMIZED
    enable_fallback: bool = True
    enable_reflection: bool = True
    max_steps: int = 25
    
    # 成本阈值 (元)
    cost_limit_per_request: float = 0.1
    
    @classmethod
    def from_env(cls) -> "TripleAgentConfig":
        """从环境变量加载配置"""
        strategy = os.getenv("ROUTING_STRATEGY", "cost_optimized")
        try:
            routing = RoutingStrategy(strategy)
        except ValueError:
            routing = RoutingStrategy.COST_OPTIMIZED
        
        return cls(
            default_agent=os.getenv("DEFAULT_AGENT", "autoglm"),
            routing_strategy=routing,
            enable_fallback=os.getenv("ENABLE_FALLBACK", "true").lower() == "true",
            enable_reflection=os.getenv("ENABLE_REFLECTION", "true").lower() == "true",
            max_steps=int(os.getenv("MAX_EXECUTION_STEPS", "25")),
            cost_limit_per_request=float(os.getenv("COST_LIMIT_PER_REQUEST", "0.1")),
        )


@dataclass
class TripleAgentResult:
    """三模型执行结果"""
    success: bool
    response: AgentResponse
    provider_used: str
    fallback_chain: List[str]
    cost_estimate: float  # 元
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "thinking": self.response.thinking,
            "action": self.response.action,
            "raw_content": self.response.raw_content,
            "error": self.response.error,
            "provider_used": self.provider_used,
            "fallback_chain": self.fallback_chain,
            "cost_estimate": self.cost_estimate,
        }


# 成本估算 (元/次)
COST_PER_CALL = {
    "autoglm": 0.01,
    "mobile_agent": 0.02,
    "ui_tars": 0.05,
}


class TripleAgentService:
    """
    三模型协调服务
    
    功能:
    1. 智能路由: 根据任务类型和复杂度选择最佳模型
    2. 级联回退: 失败时自动尝试下一个模型
    3. 成本优化: 优先使用低成本模型
    4. 性能追踪: 记录每次调用的成本和效果
    """
    
    def __init__(self, config: Optional[TripleAgentConfig] = None):
        self.config = config or TripleAgentConfig.from_env()
        
        # 初始化 Providers
        self.autoglm = AutoGLMProvider()
        self.mobile_agent = MobileAgentProvider()
        self.ui_tars = UITARSProvider()
        
        # Provider 映射
        self._providers = {
            "autoglm": self.autoglm,
            "mobile_agent": self.mobile_agent,
            "ui_tars": self.ui_tars,
        }
        
        # 注册到 Registry
        AgentProviderRegistry.register(self.autoglm, is_default=True)
        if self.mobile_agent.is_available():
            AgentProviderRegistry.register(self.mobile_agent)
        if self.ui_tars.is_available():
            AgentProviderRegistry.register(self.ui_tars)
        
        # 任务分解器
        self.task_decomposer = TaskDecomposer()
    
    def get_provider(self, name: str) -> Optional[AgentProvider]:
        """获取指定 Provider"""
        return self._providers.get(name)
    
    def get_fallback_chain(self, primary: str) -> List[str]:
        """获取回退链"""
        if self.config.routing_strategy == RoutingStrategy.COST_OPTIMIZED:
            chain = ["autoglm", "mobile_agent", "ui_tars"]
        elif self.config.routing_strategy == RoutingStrategy.PERFORMANCE_FIRST:
            chain = ["ui_tars", "mobile_agent", "autoglm"]
        else:
            chain = ["autoglm", "mobile_agent", "ui_tars"]
        
        # 确保 primary 在最前面
        if primary in chain:
            chain.remove(primary)
        chain.insert(0, primary)
        
        # 过滤不可用的
        return [p for p in chain if self._providers[p].is_available()]
    
    def assess_complexity(self, instruction: str) -> TaskComplexity:
        """
        评估任务复杂度
        
        规则:
        - SIMPLE: 单一操作 (点击、输入、查询)
        - MEDIUM: 多步骤 (分解后 2-5 个子任务)
        - COMPLEX: 需要视觉理解 (描述模糊、需要看图)
        """
        # 视觉关键词
        visual_keywords = [
            "看", "图", "照片", "屏幕", "显示", "找到", "在哪", "位置",
            "哪个", "这个", "那个", "什么", "怎么样",
        ]
        
        # 多步骤关键词
        multi_step_keywords = [
            "然后", "接着", "之后", "首先", "最后", "并且",
            "同时", "另外", "还要", "再",
        ]
        
        # 检查视觉需求
        for keyword in visual_keywords:
            if keyword in instruction:
                return TaskComplexity.COMPLEX
        
        # 检查多步骤
        step_count = sum(1 for k in multi_step_keywords if k in instruction)
        if step_count >= 2:
            return TaskComplexity.MEDIUM
        
        # 检查标点分隔的多任务
        separators = ["，", ",", "。", "；", ";"]
        sep_count = sum(instruction.count(s) for s in separators)
        if sep_count >= 2:
            return TaskComplexity.MEDIUM
        
        return TaskComplexity.SIMPLE
    
    def select_provider(
        self,
        instruction: str,
        task_type: Optional[TaskType] = None,
    ) -> str:
        """
        选择最佳 Provider
        
        路由规则:
        - 简单操作 → AutoGLM (低成本)
        - 多步骤任务 → MobileAgent (多Agent协调)
        - 视觉任务 → UI-TARS (最强视觉)
        """
        complexity = self.assess_complexity(instruction)
        
        # 策略: 仅使用单一模型
        if self.config.routing_strategy == RoutingStrategy.AUTOGLM_ONLY:
            return "autoglm"
        if self.config.routing_strategy == RoutingStrategy.MOBILE_AGENT_ONLY:
            return "mobile_agent" if self.mobile_agent.is_available() else "autoglm"
        if self.config.routing_strategy == RoutingStrategy.UI_TARS_ONLY:
            return "ui_tars" if self.ui_tars.is_available() else "autoglm"
        
        # 策略: 性能优先
        if self.config.routing_strategy == RoutingStrategy.PERFORMANCE_FIRST:
            if self.ui_tars.is_available():
                return "ui_tars"
            elif self.mobile_agent.is_available():
                return "mobile_agent"
            return "autoglm"
        
        # 策略: 成本优化 / 平衡
        if complexity == TaskComplexity.SIMPLE:
            return "autoglm"
        elif complexity == TaskComplexity.MEDIUM:
            return "mobile_agent" if self.mobile_agent.is_available() else "autoglm"
        else:  # COMPLEX
            if self.ui_tars.is_available():
                return "ui_tars"
            elif self.mobile_agent.is_available():
                return "mobile_agent"
            return "autoglm"
    
    async def execute(
        self,
        instruction: str,
        screenshot: Optional[bytes] = None,
        page_path: Optional[str] = None,
        force_provider: Optional[str] = None,
    ) -> TripleAgentResult:
        """
        执行指令
        
        Args:
            instruction: 用户指令
            screenshot: 当前截图
            page_path: 当前页面路径
            force_provider: 强制使用指定 Provider
            
        Returns:
            TripleAgentResult: 执行结果
        """
        # 选择 Provider
        if force_provider and force_provider in self._providers:
            primary = force_provider
        else:
            primary = self.select_provider(instruction)
        
        # 获取回退链
        if self.config.enable_fallback:
            fallback_chain = self.get_fallback_chain(primary)
        else:
            fallback_chain = [primary]
        
        # 依次尝试
        total_cost = 0.0
        providers_tried = []
        
        for provider_name in fallback_chain:
            provider = self._providers[provider_name]
            if not provider.is_available():
                continue
            
            providers_tried.append(provider_name)
            total_cost += COST_PER_CALL.get(provider_name, 0.01)
            
            try:
                response = await provider.predict(
                    instruction,
                    screenshots=[screenshot] if screenshot else None,
                    context={"page_path": page_path},
                )
                
                if response.success:
                    return TripleAgentResult(
                        success=True,
                        response=response,
                        provider_used=provider_name,
                        fallback_chain=providers_tried,
                        cost_estimate=total_cost,
                    )
                
            except Exception as e:
                print(f"Provider {provider_name} failed: {e}")
                continue
        
        # 全部失败
        return TripleAgentResult(
            success=False,
            response=AgentResponse(
                thinking="",
                action="",
                raw_content="",
                success=False,
                error="All providers failed",
            ),
            provider_used="",
            fallback_chain=providers_tried,
            cost_estimate=total_cost,
        )
    
    async def execute_multi_task(
        self,
        command: str,
        screenshot: Optional[bytes] = None,
        page_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        执行多任务指令
        
        分解复合指令并逐个执行
        """
        # 分解任务
        tasks = await self.task_decomposer.decompose(command)
        
        if not tasks:
            return {
                "success": False,
                "error": "无法识别任务",
                "command": command,
                "tasks": [],
            }
        
        # 执行每个任务
        results = []
        total_cost = 0.0
        
        for task in tasks:
            task.status = TaskStatus.RUNNING
            
            result = await self.execute(
                task.to_instruction(),
                screenshot=screenshot,
                page_path=page_path,
            )
            
            task.status = TaskStatus.COMPLETED if result.success else TaskStatus.FAILED
            total_cost += result.cost_estimate
            
            results.append({
                "task_id": task.id,
                "task_type": task.type.value,
                "instruction": task.to_instruction(),
                "success": result.success,
                "provider_used": result.provider_used,
                "response": result.response.action if result.success else result.response.error,
            })
        
        overall_success = all(r["success"] for r in results)
        
        return {
            "success": overall_success,
            "command": command,
            "tasks_count": len(tasks),
            "tasks": results,
            "total_cost": total_cost,
            "summary": self.task_decomposer.get_task_summary(tasks),
        }
    
    def list_providers(self) -> List[Dict[str, Any]]:
        """列出所有 Provider 状态"""
        return [
            {
                "name": name,
                "type": provider.agent_type.value,
                "available": provider.is_available(),
                "cost_per_call": COST_PER_CALL.get(name, 0),
                "is_default": self.config.default_agent == name,
            }
            for name, provider in self._providers.items()
        ]
    
    def set_routing_strategy(self, strategy: str) -> bool:
        """设置路由策略"""
        try:
            self.config.routing_strategy = RoutingStrategy(strategy)
            return True
        except ValueError:
            return False
    
    def set_default_provider(self, name: str) -> bool:
        """设置默认 Provider"""
        if name in self._providers:
            self.config.default_agent = name
            return True
        return False


# 单例
_triple_agent_service: Optional[TripleAgentService] = None


def get_triple_agent_service() -> TripleAgentService:
    """获取三模型服务单例"""
    global _triple_agent_service
    if _triple_agent_service is None:
        _triple_agent_service = TripleAgentService()
    return _triple_agent_service


# 导出
__all__ = [
    "RoutingStrategy",
    "TaskComplexity",
    "TripleAgentConfig",
    "TripleAgentResult",
    "TripleAgentService",
    "get_triple_agent_service",
    "COST_PER_CALL",
]
