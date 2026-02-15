"""
UI-TARS Client

UI-TARS 模型客户端，支持 HuggingFace Endpoint 和 vLLM 部署。
基于 ByteDance UI-TARS-1.5-7B 模型。

参考: https://github.com/bytedance/UI-TARS
"""

import os
import re
import ast
import math
import base64
import asyncio
from io import BytesIO
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Tuple
from PIL import Image

from openai import AsyncOpenAI

from app.services.agent_provider import (
    AgentProvider,
    AgentType,
    AgentResponse,
)


# ============== 常量 ==============

IMAGE_FACTOR = 28
MIN_PIXELS = 100 * 28 * 28
MAX_PIXELS = 16384 * 28 * 28
MAX_RATIO = 200


# ============== Prompt 模板 ==============

COMPUTER_USE_PROMPT = """You are a GUI agent for Synapse OS, a restaurant management system. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task.

## Output Format
```
Thought: ...
Action: ...
```

## Action Space

click(start_box='(x,y)')
left_double(start_box='(x,y)')
right_single(start_box='(x,y)')
drag(start_box='(x1,y1)', end_box='(x2,y2)')
hotkey(key='ctrl c')
type(content='xxx')
scroll(start_box='(x,y)', direction='down or up')
wait()
finished(content='xxx')

## Synapse OS Context

You are operating a restaurant POS system with these modules:
- POS (/pos): Order entry, menu items, cart
- Tables (/tables): Table management, checkout
- Menu (/menu): Menu items, categories, modifiers
- Orders (/orders): Order history, status
- KDS (/kds): Kitchen display
- Reports (/reports): Sales analytics

## Note
- Use Chinese in `Thought` part for Chinese instructions
- Write a small plan and summarize your next action in `Thought` part
- Coordinates are in range (0-1000, 0-1000)

## User Instruction
{instruction}
"""

MOBILE_USE_PROMPT = """You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task.

## Output Format
```
Thought: ...
Action: ...
```

## Action Space

click(start_box='(x,y)')
long_press(start_box='(x,y)')
type(content='')
scroll(start_box='(x,y)', direction='down or up or right or left')
open_app(app_name='')
drag(start_box='(x1,y1)', end_box='(x2,y2)')
press_home()
press_back()
finished(content='xxx')

## Note
- Use Chinese in `Thought` part for Chinese instructions
- Write a small plan and summarize your next action in `Thought` part

## User Instruction
{instruction}
"""


# ============== 配置 ==============

@dataclass
class UITARSConfig:
    """UI-TARS 配置"""
    api_key: str = ""
    base_url: str = "https://api-inference.huggingface.co/v1"
    model: str = "tgi"
    max_tokens: int = 400
    temperature: float = 0.0
    timeout: int = 120
    max_retry: int = 3
    
    # 图像配置
    image_width: int = 1920
    image_height: int = 1080
    
    # 坐标配置
    coordinate_factor: int = 1000  # UI-TARS 使用 0-1000 范围
    
    @classmethod
    def from_env(cls) -> "UITARSConfig":
        """从环境变量加载配置"""
        return cls(
            api_key=os.getenv("UI_TARS_API_KEY", ""),
            base_url=os.getenv("UI_TARS_BASE_URL", "https://api-inference.huggingface.co/v1"),
            model=os.getenv("UI_TARS_MODEL", "tgi"),
            max_tokens=int(os.getenv("UI_TARS_MAX_TOKENS", "400")),
            temperature=float(os.getenv("UI_TARS_TEMPERATURE", "0.0")),
            image_width=int(os.getenv("UI_TARS_IMAGE_WIDTH", "1920")),
            image_height=int(os.getenv("UI_TARS_IMAGE_HEIGHT", "1080")),
        )


# ============== 图像处理 ==============

def round_by_factor(number: int, factor: int) -> int:
    """Returns the closest integer divisible by 'factor'."""
    return round(number / factor) * factor


def ceil_by_factor(number: int, factor: int) -> int:
    """Returns the smallest integer >= 'number' divisible by 'factor'."""
    return math.ceil(number / factor) * factor


def floor_by_factor(number: int, factor: int) -> int:
    """Returns the largest integer <= 'number' divisible by 'factor'."""
    return math.floor(number / factor) * factor


def smart_resize(
    height: int,
    width: int,
    factor: int = IMAGE_FACTOR,
    min_pixels: int = MIN_PIXELS,
    max_pixels: int = MAX_PIXELS,
) -> Tuple[int, int]:
    """
    智能调整图片尺寸
    
    确保:
    1. 尺寸可被 factor 整除
    2. 像素数在 [min_pixels, max_pixels] 范围内
    3. 尽量保持宽高比
    """
    if max(height, width) / min(height, width) > MAX_RATIO:
        raise ValueError(f"Aspect ratio too large: {max(height, width) / min(height, width)}")
    
    h_bar = max(factor, round_by_factor(height, factor))
    w_bar = max(factor, round_by_factor(width, factor))
    
    if h_bar * w_bar > max_pixels:
        beta = math.sqrt((height * width) / max_pixels)
        h_bar = floor_by_factor(height / beta, factor)
        w_bar = floor_by_factor(width / beta, factor)
    elif h_bar * w_bar < min_pixels:
        beta = math.sqrt(min_pixels / (height * width))
        h_bar = ceil_by_factor(height * beta, factor)
        w_bar = ceil_by_factor(width * beta, factor)
    
    return h_bar, w_bar


def process_image(image_source: Any, config: UITARSConfig) -> Tuple[str, int, int]:
    """
    处理图片并返回 Base64
    
    Returns:
        (base64_url, resized_width, resized_height)
    """
    # 加载图片
    if isinstance(image_source, str):
        if image_source.startswith('data:image'):
            return image_source, config.image_width, config.image_height
        image = Image.open(image_source)
    elif isinstance(image_source, bytes):
        image = Image.open(BytesIO(image_source))
    elif isinstance(image_source, Image.Image):
        image = image_source
    else:
        raise ValueError(f"Unsupported image source: {type(image_source)}")
    
    # 调整尺寸
    resized_height, resized_width = smart_resize(image.height, image.width)
    image = image.resize((resized_width, resized_height))
    
    # 转换为 Base64
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    base64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    
    return f"data:image/png;base64,{base64_str}", resized_width, resized_height


# ============== Action 解析 ==============

def parse_action_string(action_str: str) -> Optional[Dict[str, Any]]:
    """解析单个 action 字符串"""
    try:
        node = ast.parse(action_str, mode='eval')
        if not isinstance(node, ast.Expression):
            return None
        
        call = node.body
        if not isinstance(call, ast.Call):
            return None
        
        # 函数名
        if isinstance(call.func, ast.Name):
            func_name = call.func.id
        elif isinstance(call.func, ast.Attribute):
            func_name = call.func.attr
        else:
            func_name = None
        
        # 参数
        kwargs = {}
        for kw in call.keywords:
            key = kw.arg
            if isinstance(kw.value, ast.Constant):
                value = kw.value.value
            elif isinstance(kw.value, ast.Str):
                value = kw.value.s
            else:
                value = None
            kwargs[key] = value
        
        return {"function": func_name, "args": kwargs}
    except Exception as e:
        print(f"Failed to parse action '{action_str}': {e}")
        return None


def parse_coordinates(coord_str: str, factor: int = 1000) -> Tuple[float, float]:
    """
    解析坐标字符串
    
    Args:
        coord_str: "(x,y)" 格式的字符串
        factor: 坐标缩放因子
        
    Returns:
        (x, y) 相对坐标 (0-1)
    """
    coord_str = coord_str.replace("(", "").replace(")", "").strip()
    parts = coord_str.split(",")
    x = float(parts[0].strip()) / factor
    y = float(parts[1].strip()) / factor
    return x, y


def parse_ui_tars_response(
    response: str,
    resized_width: int,
    resized_height: int,
) -> Dict[str, Any]:
    """
    解析 UI-TARS 响应
    
    Returns:
        {
            "thought": str,
            "action_type": str,
            "action_inputs": {...},
            "raw_action": str,
        }
    """
    result = {
        "thought": "",
        "action_type": "",
        "action_inputs": {},
        "raw_action": "",
        "is_finished": False,
    }
    
    # 提取 Thought
    if "Thought:" in response:
        thought_part = response.split("Thought:")[-1]
        if "Action:" in thought_part:
            result["thought"] = thought_part.split("Action:")[0].strip()
        else:
            result["thought"] = thought_part.strip()
    
    # 提取 Action
    if "Action:" in response:
        action_str = response.split("Action:")[-1].strip()
        result["raw_action"] = action_str
        
        # 解析 action
        parsed = parse_action_string(action_str)
        if parsed:
            result["action_type"] = parsed["function"]
            result["action_inputs"] = parsed["args"]
            
            # 处理坐标
            for key in ["start_box", "end_box", "point"]:
                if key in result["action_inputs"]:
                    coord_str = result["action_inputs"][key]
                    x, y = parse_coordinates(coord_str)
                    result["action_inputs"][f"{key}_normalized"] = (x, y)
                    result["action_inputs"][f"{key}_pixels"] = (
                        int(x * resized_width),
                        int(y * resized_height),
                    )
            
            # 检查是否完成
            if result["action_type"] == "finished":
                result["is_finished"] = True
    
    return result


def convert_to_synapse_action(parsed: Dict[str, Any]) -> Dict[str, Any]:
    """
    将 UI-TARS action 转换为 Synapse OS action 格式
    """
    action_type = parsed.get("action_type", "")
    inputs = parsed.get("action_inputs", {})
    
    # 映射 action 类型
    action_map = {
        "click": "Click",
        "left_double": "Click",
        "right_single": "Click",
        "type": "Type",
        "scroll": "Scroll",
        "finished": "finish",
        "wait": "Wait",
    }
    
    synapse_action = {
        "action": action_map.get(action_type, action_type),
    }
    
    # 处理参数
    if action_type in ["click", "left_double", "right_single"]:
        if "start_box_normalized" in inputs:
            x, y = inputs["start_box_normalized"]
            synapse_action["params"] = {
                "x": x,
                "y": y,
                "button": "double" if action_type == "left_double" else "left" if action_type != "right_single" else "right",
            }
    
    elif action_type == "type":
        synapse_action["params"] = {
            "text": inputs.get("content", ""),
        }
    
    elif action_type == "scroll":
        synapse_action["params"] = {
            "direction": inputs.get("direction", "down"),
        }
    
    elif action_type == "finished":
        synapse_action["action"] = "finish"
        synapse_action["message"] = inputs.get("content", "Task completed")
    
    elif action_type == "wait":
        synapse_action["params"] = {
            "seconds": 5,
        }
    
    return synapse_action


# ============== 添加 box token ==============

def add_box_token(input_string: str) -> str:
    """
    为响应添加 box token (用于多轮对话)
    """
    if "Action: " in input_string and "start_box=" in input_string:
        suffix = input_string.split("Action: ")[0] + "Action: "
        actions = input_string.split("Action: ")[1:]
        processed_actions = []
        
        for action in actions:
            action = action.strip()
            coordinates = re.findall(
                r"(start_box|end_box)='\((\d+),\s*(\d+)\)'", action
            )
            
            updated_action = action
            for coord_type, x, y in coordinates:
                updated_action = updated_action.replace(
                    f"{coord_type}='({x},{y})'",
                    f"{coord_type}='<|box_start|>({x},{y})<|box_end|>'"
                )
            processed_actions.append(updated_action)
        
        return suffix + "\n\n".join(processed_actions)
    
    return input_string


# ============== Client ==============

class UITARSClient:
    """
    UI-TARS 客户端
    
    使用 OpenAI 兼容接口调用 HuggingFace Endpoint
    """
    
    ERROR_CALLING_LLM = "Error calling LLM"
    RETRY_WAIT_SECONDS = 5
    
    def __init__(self, config: Optional[UITARSConfig] = None):
        self.config = config or UITARSConfig.from_env()
        self.client = AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url,
            timeout=self.config.timeout,
        )
    
    async def predict(
        self,
        instruction: str,
        images: Optional[List[Any]] = None,
        history: Optional[List[Dict[str, Any]]] = None,
        use_mobile_prompt: bool = False,
    ) -> Tuple[str, Dict[str, Any], Optional[Any]]:
        """
        执行预测
        
        Returns:
            (response_text, parsed_action, raw_response)
        """
        # 构建消息
        messages = self._build_messages(
            instruction, images, history, use_mobile_prompt
        )
        
        counter = self.config.max_retry
        wait_seconds = self.RETRY_WAIT_SECONDS
        
        while counter > 0:
            try:
                response = await self.client.chat.completions.create(
                    model=self.config.model,
                    messages=messages,
                    max_tokens=self.config.max_tokens,
                    temperature=self.config.temperature,
                    stream=False,
                )
                
                response_text = response.choices[0].message.content or ""
                
                # 解析响应
                resized_width = self.config.image_width
                resized_height = self.config.image_height
                
                if images:
                    # 获取实际的 resize 尺寸
                    _, resized_width, resized_height = process_image(
                        images[0], self.config
                    )
                
                parsed = parse_ui_tars_response(
                    response_text, resized_width, resized_height
                )
                
                return response_text, parsed, response
                
            except Exception as e:
                print(f"Error calling UI-TARS: {e}")
                await asyncio.sleep(wait_seconds)
                wait_seconds *= 1.5
                counter -= 1
        
        return self.ERROR_CALLING_LLM, {}, None
    
    def _build_messages(
        self,
        instruction: str,
        images: Optional[List[Any]] = None,
        history: Optional[List[Dict[str, Any]]] = None,
        use_mobile_prompt: bool = False,
    ) -> List[Dict[str, Any]]:
        """构建消息"""
        messages = []
        
        # 添加历史消息
        if history:
            for msg in history:
                if msg.get("role") == "assistant":
                    # 添加 box token
                    content = add_box_token(msg.get("content", ""))
                    messages.append({"role": "assistant", "content": content})
                else:
                    messages.append(msg)
        
        # 构建用户消息
        prompt_template = MOBILE_USE_PROMPT if use_mobile_prompt else COMPUTER_USE_PROMPT
        prompt = prompt_template.format(instruction=instruction)
        
        content = []
        
        # 添加图片
        if images:
            for image in images:
                base64_url, _, _ = process_image(image, self.config)
                content.append({
                    "type": "image_url",
                    "image_url": {"url": base64_url}
                })
        
        # 添加文本
        content.append({"type": "text", "text": prompt})
        
        messages.append({"role": "user", "content": content})
        
        return messages
    
    def is_available(self) -> bool:
        """检查是否可用"""
        return bool(self.config.api_key)


# ============== Provider ==============

class UITARSProvider(AgentProvider):
    """
    UI-TARS Provider
    
    实现 AgentProvider 接口
    """
    
    def __init__(self, config: Optional[UITARSConfig] = None):
        self.config = config or UITARSConfig.from_env()
        self.client = UITARSClient(self.config)
    
    @property
    def name(self) -> str:
        return "ui_tars"
    
    @property
    def agent_type(self) -> AgentType:
        return AgentType.UI_TARS
    
    async def predict(
        self,
        prompt: str,
        screenshots: Optional[List[bytes]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> AgentResponse:
        """执行推理"""
        # 调用 UI-TARS
        response_text, parsed, raw_response = await self.client.predict(
            instruction=prompt,
            images=screenshots,
            history=context.get("history") if context else None,
        )
        
        # 检查错误
        if response_text == self.client.ERROR_CALLING_LLM:
            return AgentResponse(
                thinking="",
                action="",
                raw_content="",
                success=False,
                error="Failed to call UI-TARS API",
            )
        
        # 转换为 Synapse 格式
        synapse_action = convert_to_synapse_action(parsed)
        
        import json
        return AgentResponse(
            thinking=parsed.get("thought", ""),
            action=json.dumps(synapse_action),
            raw_content=response_text,
            success=True,
        )
    
    def build_prompt(
        self,
        instruction: str,
        page_path: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """构建 Prompt"""
        parts = [instruction]
        
        if page_path:
            parts.append(f"当前页面: {page_path}")
        
        if context and context.get("additional_info"):
            parts.append(f"附加信息: {context['additional_info']}")
        
        return "\n".join(parts)
    
    def is_available(self) -> bool:
        """检查是否可用"""
        return self.client.is_available()


# 导出
__all__ = [
    "UITARSConfig",
    "UITARSClient",
    "UITARSProvider",
    "parse_ui_tars_response",
    "convert_to_synapse_action",
    "smart_resize",
    "process_image",
]
