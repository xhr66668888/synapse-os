"""
Enhanced UI-TARS Integration

完整集成 UI-TARS 的高级功能，包括:
- parse_action_to_structure_output() - 完整坐标解析
- grounding 能力 - 元素定位
- Web Action 转换 - 适配 DOM 操作
"""

import re
import ast
import math
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass


# ============== 常量 (来自 UI-TARS) ==============

IMAGE_FACTOR = 28
MIN_PIXELS = 100 * 28 * 28
MAX_PIXELS = 16384 * 28 * 28
MAX_RATIO = 200


# ============== 坐标处理函数 (复用 UI-TARS) ==============

def round_by_factor(number: int, factor: int) -> int:
    """Returns the closest integer to 'number' that is divisible by 'factor'."""
    return round(number / factor) * factor


def ceil_by_factor(number: int, factor: int) -> int:
    """Returns the smallest integer >= 'number' that is divisible by 'factor'."""
    return math.ceil(number / factor) * factor


def floor_by_factor(number: int, factor: int) -> int:
    """Returns the largest integer <= 'number' that is divisible by 'factor'."""
    return math.floor(number / factor) * factor


def smart_resize(
    height: int,
    width: int,
    factor: int = IMAGE_FACTOR,
    min_pixels: int = MIN_PIXELS,
    max_pixels: int = MAX_PIXELS,
) -> Tuple[int, int]:
    """
    智能调整图片尺寸 (复用 UI-TARS 算法)
    
    确保:
    1. 尺寸可被 factor 整除
    2. 像素数在范围内
    3. 保持宽高比
    """
    if max(height, width) / min(height, width) > MAX_RATIO:
        raise ValueError(f"Aspect ratio too large: {max(height, width) / min(height, width)}")
    
    h_bar = max(factor, round_by_factor(height, factor))
    w_bar = max(factor, round_by_factor(width, factor))
    
    if h_bar * w_bar > max_pixels:
        beta = math.sqrt((height * width) / max_pixels)
        h_bar = floor_by_factor(int(height / beta), factor)
        w_bar = floor_by_factor(int(width / beta), factor)
    elif h_bar * w_bar < min_pixels:
        beta = math.sqrt(min_pixels / (height * width))
        h_bar = ceil_by_factor(int(height * beta), factor)
        w_bar = ceil_by_factor(int(width * beta), factor)
    
    return h_bar, w_bar


# ============== Action 解析 (增强版) ==============

def convert_point_to_coordinates(text: str, is_answer: bool = False) -> str:
    """转换 <point> 标签为坐标"""
    pattern = r"<point>(\d+)\s+(\d+)</point>"
    
    def replace_match(match):
        x1, y1 = map(int, match.groups())
        x = (x1 + x1) // 2
        y = (y1 + y1) // 2
        return f"({x},{y})"
    
    text = re.sub(r"\[EOS\]", "", text)
    return re.sub(pattern, replace_match, text).strip()


def escape_single_quotes(text: str) -> str:
    """转义单引号"""
    pattern = r"(?<!\\)'"
    return re.sub(pattern, r"\\'", text)


def parse_action(action_str: str) -> Optional[Dict[str, Any]]:
    """
    解析单个 action 字符串
    
    Args:
        action_str: 如 "click(start_box='(100,200)')"
        
    Returns:
        {"function": "click", "args": {"start_box": "(100,200)"}}
    """
    try:
        node = ast.parse(action_str, mode='eval')
        
        if not isinstance(node, ast.Expression):
            raise ValueError("Not an expression")
        
        call = node.body
        if not isinstance(call, ast.Call):
            raise ValueError("Not a function call")
        
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


def parse_action_to_structure_output(
    text: str,
    factor: int = 1000,
    origin_resized_height: int = 1080,
    origin_resized_width: int = 1920,
    model_type: str = "qwen25vl",
    max_pixels: int = MAX_PIXELS,
    min_pixels: int = MIN_PIXELS,
) -> List[Dict[str, Any]]:
    """
    完整的 UI-TARS 响应解析 (复用原始算法)
    
    Args:
        text: UI-TARS 的原始响应
        factor: 坐标因子 (UI-TARS 使用 1000)
        origin_resized_height: 原始调整后高度
        origin_resized_width: 原始调整后宽度
        model_type: 模型类型
        
    Returns:
        解析后的 action 列表
    """
    text = text.strip()
    
    # 格式转换
    if "<point>" in text:
        text = convert_point_to_coordinates(text)
    if "start_point=" in text:
        text = text.replace("start_point=", "start_box=")
    if "end_point=" in text:
        text = text.replace("end_point=", "end_box=")
    if "point=" in text:
        text = text.replace("point=", "start_box=")
    
    # 计算 smart_resize 尺寸
    if model_type == "qwen25vl":
        smart_resize_height, smart_resize_width = smart_resize(
            origin_resized_height,
            origin_resized_width,
            factor=IMAGE_FACTOR,
            min_pixels=min_pixels,
            max_pixels=max_pixels,
        )
    else:
        smart_resize_height = origin_resized_height
        smart_resize_width = origin_resized_width
    
    # 提取 Thought
    thought = None
    reflection = None
    
    if text.startswith("Thought:"):
        thought_pattern = r"Thought: (.+?)(?=\s*Action: |$)"
        thought_match = re.search(thought_pattern, text, re.DOTALL)
        if thought_match:
            thought = thought_match.group(1).strip()
    elif text.startswith("Reflection:"):
        thought_pattern = r"Reflection: (.+?)Action_Summary: (.+?)(?=\s*Action: |$)"
        thought_match = re.search(thought_pattern, text, re.DOTALL)
        if thought_match:
            reflection = thought_match.group(1).strip()
            thought = thought_match.group(2).strip()
    
    # 提取 Action
    if "Action:" not in text:
        return []
    
    action_str = text.split("Action: ")[-1]
    
    # 处理多个 action
    tmp_all_action = action_str.split(")\n\n")
    all_action = []
    
    for action_str in tmp_all_action:
        # 处理 type() 中的特殊字符
        if "type(content" in action_str:
            if not action_str.strip().endswith(")"):
                action_str = action_str.strip() + ")"
            
            def escape_quotes(match):
                return match.group(1)
            
            pattern = r"type\(content='(.*?)'\)"
            if re.search(pattern, action_str):
                content = re.sub(pattern, escape_quotes, action_str)
                content = escape_single_quotes(content)
                action_str = f"type(content='{content}')"
        
        if not action_str.strip().endswith(")"):
            action_str = action_str.strip() + ")"
        
        all_action.append(action_str)
    
    # 解析所有 action
    parsed_actions = [
        parse_action(action.replace("\n", "\\n").lstrip())
        for action in all_action
    ]
    
    actions = []
    for action_instance, raw_str in zip(parsed_actions, all_action):
        if action_instance is None:
            print(f"Action can't parse: {raw_str}")
            continue
        
        action_type = action_instance["function"]
        params = action_instance["args"]
        
        action_inputs = {}
        for param_name, param in params.items():
            if param == "":
                continue
            
            param = str(param).lstrip()
            action_inputs[param_name.strip()] = param
            
            # 处理坐标
            if "start_box" in param_name or "end_box" in param_name:
                ori_box = param
                numbers = ori_box.replace("(", "").replace(")", "").split(",")
                
                if model_type == "qwen25vl":
                    float_numbers = []
                    for num_idx, num in enumerate(numbers):
                        num = float(num)
                        if (num_idx + 1) % 2 == 0:
                            float_numbers.append(float(num / smart_resize_height))
                        else:
                            float_numbers.append(float(num / smart_resize_width))
                else:
                    float_numbers = [float(num) / factor for num in numbers]
                
                if len(float_numbers) == 2:
                    float_numbers = [
                        float_numbers[0], float_numbers[1],
                        float_numbers[0], float_numbers[1],
                    ]
                
                action_inputs[param_name.strip()] = str(float_numbers)
        
        actions.append({
            "reflection": reflection,
            "thought": thought,
            "action_type": action_type,
            "action_inputs": action_inputs,
            "text": text,
        })
    
    return actions


# ============== Web Action 转换 ==============

@dataclass
class WebAction:
    """Web DOM 操作"""
    type: str                         # click, type, scroll, navigate, etc.
    selector: Optional[str] = None    # CSS 选择器
    x: Optional[float] = None         # 相对 x 坐标 (0-1)
    y: Optional[float] = None         # 相对 y 坐标 (0-1)
    text: Optional[str] = None        # 输入文本
    direction: Optional[str] = None   # 滚动方向
    path: Optional[str] = None        # 导航路径
    message: Optional[str] = None     # 完成消息
    
    def to_dict(self) -> Dict[str, Any]:
        result = {"type": self.type}
        if self.selector:
            result["selector"] = self.selector
        if self.x is not None:
            result["x"] = self.x
        if self.y is not None:
            result["y"] = self.y
        if self.text:
            result["text"] = self.text
        if self.direction:
            result["direction"] = self.direction
        if self.path:
            result["path"] = self.path
        if self.message:
            result["message"] = self.message
        return result


def convert_to_web_action(
    parsed_action: Dict[str, Any],
    screen_width: int = 1920,
    screen_height: int = 1080,
) -> WebAction:
    """
    将解析的 UI-TARS action 转换为 WebAction
    
    Args:
        parsed_action: parse_action_to_structure_output 的结果
        screen_width: 屏幕宽度
        screen_height: 屏幕高度
        
    Returns:
        WebAction 对象
    """
    action_type = parsed_action.get("action_type", "")
    action_inputs = parsed_action.get("action_inputs", {})
    
    # 类型映射
    type_map = {
        "click": "click",
        "left_double": "double_click",
        "right_single": "right_click",
        "type": "type",
        "scroll": "scroll",
        "drag": "drag",
        "wait": "wait",
        "finished": "finish",
        "open_app": "navigate",
        "press_home": "navigate",
        "press_back": "back",
    }
    
    web_type = type_map.get(action_type, action_type)
    
    # 提取坐标
    x, y = None, None
    if "start_box" in action_inputs:
        try:
            coords = eval(action_inputs["start_box"])
            if len(coords) >= 2:
                if len(coords) == 4:
                    x = (coords[0] + coords[2]) / 2
                    y = (coords[1] + coords[3]) / 2
                else:
                    x, y = coords[0], coords[1]
        except Exception:
            pass
    
    # 创建 WebAction
    action = WebAction(type=web_type, x=x, y=y)
    
    # 处理特定类型
    if action_type == "type":
        action.text = action_inputs.get("content", "")
    
    elif action_type == "scroll":
        action.direction = action_inputs.get("direction", "down")
    
    elif action_type == "finished":
        action.message = action_inputs.get("content", "任务完成")
    
    elif action_type in ["open_app", "press_home"]:
        action.path = "/"
    
    return action


# ============== Grounding 功能 ==============

GROUNDING_PROMPT = """You are a UI element locator. Given the screenshot, find the element that matches the description.

## Element Description
{description}

## Output Format
Output the bounding box of the element in format:
start_box='(x,y)'

Where x and y are coordinates in range 0-1000.

If the element is not found, output:
not_found

## Note
- Be precise with the coordinates
- Return the center of the element
"""


async def ground_element(
    description: str,
    screenshot: bytes,
    vision_provider,
) -> Optional[Tuple[float, float]]:
    """
    使用 UI-TARS 的 grounding 能力定位元素
    
    Args:
        description: 元素描述 (如 "结账按钮")
        screenshot: 当前截图
        vision_provider: 视觉模型提供者
        
    Returns:
        (x, y) 相对坐标，或 None
    """
    prompt = GROUNDING_PROMPT.format(description=description)
    
    try:
        response = await vision_provider.predict(
            prompt=prompt,
            screenshots=[screenshot],
            context={"mode": "grounding"},
        )
        
        # 解析坐标
        content = response.raw_content
        if "not_found" in content.lower():
            return None
        
        # 提取坐标
        match = re.search(r"start_box='?\((\d+)[,\s]+(\d+)\)'?", content)
        if match:
            x = int(match.group(1)) / 1000
            y = int(match.group(2)) / 1000
            return (x, y)
        
        return None
        
    except Exception as e:
        print(f"Grounding failed: {e}")
        return None


# ============== Synapse OS 专用 ==============

# 餐饮系统常见元素的 selector 映射
SYNAPSE_ELEMENT_MAP = {
    # POS 模块
    "结账": '[data-action="checkout"], button:contains("结账")',
    "加菜": '[data-action="add-item"], button:contains("加菜")',
    "购物车": '.cart, [data-component="cart"]',
    "菜单": '.menu-list, [data-component="menu"]',
    
    # 餐桌模块
    "空桌": '.table-card.available',
    "已用": '.table-card.occupied',
    "结账按钮": 'button:contains("结账")',
    
    # 通用
    "确认": 'button:contains("确认"), button:contains("确定")',
    "取消": 'button:contains("取消")',
    "返回": 'button:contains("返回"), .back-button',
    "搜索": 'input[type="search"], .search-input',
}


def get_synapse_selector(element_name: str) -> Optional[str]:
    """获取 Synapse OS 元素的 CSS 选择器"""
    # 精确匹配
    if element_name in SYNAPSE_ELEMENT_MAP:
        return SYNAPSE_ELEMENT_MAP[element_name]
    
    # 模糊匹配
    for key, selector in SYNAPSE_ELEMENT_MAP.items():
        if key in element_name or element_name in key:
            return selector
    
    return None


# ============== 导出 ==============

__all__ = [
    "smart_resize",
    "parse_action",
    "parse_action_to_structure_output",
    "WebAction",
    "convert_to_web_action",
    "ground_element",
    "get_synapse_selector",
    "GROUNDING_PROMPT",
]
