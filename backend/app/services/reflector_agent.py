"""
Reflector Agent

自我纠错 Agent，通过对比截图验证操作是否成功。
基于 MobileAgent-v3 的 Reflector 角色设计。
"""

import os
from dataclasses import dataclass
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime

from app.services.agent_provider import AgentProvider, AgentResponse


# ============== 反思结果 ==============

@dataclass
class ReflectionResult:
    """反思分析结果"""
    success: bool                     # 操作是否成功
    confidence: float                 # 置信度 (0-1)
    analysis: str                     # 分析说明
    suggestion: Optional[str] = None  # 建议的补救措施
    should_retry: bool = False        # 是否需要重试
    alternative_action: Optional[Dict[str, Any]] = None  # 替代操作
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "confidence": self.confidence,
            "analysis": self.analysis,
            "suggestion": self.suggestion,
            "should_retry": self.should_retry,
            "alternative_action": self.alternative_action,
        }


# ============== Reflector Agent ==============

class ReflectorAgent:
    """
    Reflector Agent
    
    负责验证操作执行结果，通过对比操作前后的截图
    判断操作是否成功，并给出补救建议。
    
    功能:
    - 对比操作前后截图
    - 判断操作成功/失败
    - 分析失败原因
    - 给出补救建议
    """
    
    REFLECTION_PROMPT = """你是一个 UI 操作验证专家。请分析以下操作是否成功执行。

## 用户指令
{instruction}

## 执行的操作
{action}

## 任务
分析操作前后的两张截图，判断:
1. 界面是否发生了预期的变化
2. 操作是否成功完成
3. 是否有错误提示或异常

## 输出格式 (JSON)
{{
    "success": true/false,
    "confidence": 0.0-1.0,
    "analysis": "分析说明",
    "suggestion": "如果失败，建议的下一步操作"
}}
"""

    SIMPLE_CHECK_PROMPT = """对比这两张截图，判断界面是否发生了变化。
操作: {action}

回答格式:
- changed: true/false (界面是否变化)
- expected: true/false (变化是否符合预期)
- reason: 原因说明
"""

    def __init__(self, vision_provider: Optional[AgentProvider] = None):
        """
        初始化 Reflector
        
        Args:
            vision_provider: 用于分析截图的视觉模型 (UI-TARS 或 MobileAgent)
        """
        self.vision_provider = vision_provider
        self._reflection_history: List[ReflectionResult] = []
    
    async def analyze(
        self,
        instruction: str,
        action_taken: Dict[str, Any],
        before_screenshot: Optional[bytes],
        after_screenshot: Optional[bytes],
    ) -> ReflectionResult:
        """
        分析操作结果
        
        Args:
            instruction: 原始用户指令
            action_taken: 执行的操作
            before_screenshot: 操作前截图
            after_screenshot: 操作后截图
            
        Returns:
            ReflectionResult
        """
        # 如果没有视觉模型，使用简单规则
        if not self.vision_provider:
            return self._simple_check(action_taken, before_screenshot, after_screenshot)
        
        # 如果没有截图，假设成功
        if not before_screenshot or not after_screenshot:
            return ReflectionResult(
                success=True,
                confidence=0.5,
                analysis="无法验证 (缺少截图)",
            )
        
        # 构建 prompt
        action_str = self._format_action(action_taken)
        prompt = self.REFLECTION_PROMPT.format(
            instruction=instruction,
            action=action_str,
        )
        
        # 调用视觉模型
        try:
            response = await self.vision_provider.predict(
                prompt=prompt,
                screenshots=[before_screenshot, after_screenshot],
                context={"mode": "reflection"},
            )
            
            result = self._parse_response(response)
            self._reflection_history.append(result)
            return result
            
        except Exception as e:
            return ReflectionResult(
                success=False,
                confidence=0.3,
                analysis=f"反思分析失败: {str(e)}",
                should_retry=True,
            )
    
    async def quick_check(
        self,
        action: Dict[str, Any],
        before_screenshot: Optional[bytes],
        after_screenshot: Optional[bytes],
    ) -> bool:
        """
        快速检查操作是否成功 (不调用 AI)
        
        基于截图相似度判断
        """
        if not before_screenshot or not after_screenshot:
            return True  # 无法验证，假设成功
        
        # 简单的字节比较
        if before_screenshot == after_screenshot:
            # 截图完全相同，可能操作未生效
            action_type = action.get("type", "")
            
            # 某些操作不改变界面是正常的
            no_change_actions = {"wait", "screenshot", "finish"}
            if action_type in no_change_actions:
                return True
            
            # 其他操作应该产生变化
            return False
        
        return True  # 有变化，假设成功
    
    def analyze_failure_pattern(
        self,
        recent_results: int = 5,
    ) -> Dict[str, Any]:
        """
        分析最近的失败模式
        
        用于识别系统性问题
        """
        recent = self._reflection_history[-recent_results:]
        
        if not recent:
            return {"pattern": "none", "message": "没有历史记录"}
        
        failures = [r for r in recent if not r.success]
        success_rate = (len(recent) - len(failures)) / len(recent)
        
        if len(failures) >= 3:
            # 连续失败
            suggestions = [r.suggestion for r in failures if r.suggestion]
            return {
                "pattern": "consecutive_failures",
                "success_rate": success_rate,
                "message": "检测到连续失败，可能存在系统性问题",
                "suggestions": suggestions,
            }
        
        return {
            "pattern": "normal",
            "success_rate": success_rate,
            "message": "操作执行正常",
        }
    
    def get_recovery_suggestion(
        self,
        failed_action: Dict[str, Any],
        error_type: str = "unknown",
    ) -> Optional[Dict[str, Any]]:
        """
        获取恢复建议
        
        根据失败类型给出替代操作
        """
        action_type = failed_action.get("type", "")
        
        suggestions = {
            "click": {
                "element_not_found": {
                    "type": "wait_for",
                    "params": {"selector": failed_action.get("params", {}).get("selector"), "timeout": 5000},
                    "reasoning": "元素可能尚未加载完成，等待后重试",
                },
                "click_failed": {
                    "type": "scroll",
                    "params": {"direction": "down", "amount": 200},
                    "reasoning": "元素可能不在可视区域，滚动后重试",
                },
            },
            "type": {
                "input_not_focused": {
                    "type": "click",
                    "params": {"selector": failed_action.get("params", {}).get("selector")},
                    "reasoning": "先点击输入框获取焦点",
                },
            },
            "navigate": {
                "page_not_loaded": {
                    "type": "wait",
                    "params": {"seconds": 2},
                    "reasoning": "等待页面加载完成",
                },
            },
        }
        
        action_suggestions = suggestions.get(action_type, {})
        return action_suggestions.get(error_type)
    
    def should_escalate(self, result: ReflectionResult) -> bool:
        """
        判断是否需要升级处理 (换用更强模型)
        """
        # 低置信度且失败
        if not result.success and result.confidence < 0.5:
            return True
        
        # 检查连续失败模式
        pattern = self.analyze_failure_pattern()
        if pattern.get("pattern") == "consecutive_failures":
            return True
        
        return False
    
    def _simple_check(
        self,
        action: Dict[str, Any],
        before: Optional[bytes],
        after: Optional[bytes],
    ) -> ReflectionResult:
        """简单规则检查 (无 AI)"""
        if not before or not after:
            return ReflectionResult(
                success=True,
                confidence=0.5,
                analysis="无法验证 (缺少截图)",
            )
        
        # 比较截图大小变化
        size_diff = abs(len(before) - len(after))
        size_change_ratio = size_diff / len(before) if before else 0
        
        action_type = action.get("type", "")
        
        # 某些操作期望界面变化
        expect_change = action_type not in {"wait", "screenshot", "finish"}
        
        if expect_change:
            if size_change_ratio > 0.01:  # 1% 以上变化
                return ReflectionResult(
                    success=True,
                    confidence=0.7,
                    analysis="检测到界面变化",
                )
            else:
                return ReflectionResult(
                    success=False,
                    confidence=0.6,
                    analysis="界面未发生明显变化",
                    suggestion="请检查操作目标是否正确",
                    should_retry=True,
                )
        else:
            return ReflectionResult(
                success=True,
                confidence=0.8,
                analysis="操作类型不期望界面变化",
            )
    
    def _format_action(self, action: Dict[str, Any]) -> str:
        """格式化操作描述"""
        action_type = action.get("type", "unknown")
        params = action.get("params", {})
        
        parts = [f"类型: {action_type}"]
        for k, v in params.items():
            parts.append(f"{k}: {v}")
        
        return "\n".join(parts)
    
    def _parse_response(self, response: AgentResponse) -> ReflectionResult:
        """解析 AI 响应"""
        import json
        
        try:
            # 尝试从 raw_content 提取 JSON
            content = response.raw_content
            
            if "```json" in content:
                json_str = content.split("```json")[-1].split("```")[0]
            elif "{" in content:
                # 提取 JSON 对象
                start = content.index("{")
                end = content.rindex("}") + 1
                json_str = content[start:end]
            else:
                json_str = content
            
            data = json.loads(json_str)
            
            return ReflectionResult(
                success=data.get("success", False),
                confidence=float(data.get("confidence", 0.5)),
                analysis=data.get("analysis", ""),
                suggestion=data.get("suggestion"),
                should_retry=not data.get("success", False),
            )
            
        except Exception:
            # 解析失败，根据 response.success 判断
            return ReflectionResult(
                success=response.success,
                confidence=0.5,
                analysis=response.thinking or response.raw_content[:200],
            )
    
    def clear_history(self):
        """清除反思历史"""
        self._reflection_history.clear()


# ============== 全局实例 ==============

_reflector: Optional[ReflectorAgent] = None


def get_reflector(vision_provider: Optional[AgentProvider] = None) -> ReflectorAgent:
    """获取全局 Reflector 实例"""
    global _reflector
    if _reflector is None:
        _reflector = ReflectorAgent(vision_provider)
    return _reflector


# ============== 导出 ==============

__all__ = [
    "ReflectionResult",
    "ReflectorAgent",
    "get_reflector",
]
