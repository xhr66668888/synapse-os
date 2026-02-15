"""
配置模块
"""
from app.config.prompts import get_synapse_system_prompt, SYNAPSE_PROMPT_CN, SYNAPSE_PROMPT_EN

__all__ = [
    "get_synapse_system_prompt",
    "SYNAPSE_PROMPT_CN",
    "SYNAPSE_PROMPT_EN",
]
