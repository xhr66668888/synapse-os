"""
AI 服务 - 集成 OpenAI GPT、Whisper 等
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
import httpx

from app.config import get_settings

settings = get_settings()


class AIService:
    """AI 服务类 - 处理智能接线、意图识别等"""
    
    def __init__(self):
        self.openai_api_key = getattr(settings, 'OPENAI_API_KEY', None)
        self.openai_base_url = "https://api.openai.com/v1"
    
    async def transcribe_audio(self, audio_data: bytes, language: str = "zh") -> str:
        """
        语音转文字 (Whisper API)
        
        Args:
            audio_data: 音频数据
            language: 语言代码
            
        Returns:
            转录文本
        """
        if not self.openai_api_key:
            return "[Demo] 您好，我想预订今晚7点的桌位，4个人"
        
        async with httpx.AsyncClient() as client:
            files = {"file": ("audio.wav", audio_data, "audio/wav")}
            data = {"model": "whisper-1", "language": language}
            
            response = await client.post(
                f"{self.openai_base_url}/audio/transcriptions",
                headers={"Authorization": f"Bearer {self.openai_api_key}"},
                files=files,
                data=data
            )
            
            if response.status_code == 200:
                return response.json().get("text", "")
            else:
                raise Exception(f"Whisper API error: {response.text}")
    
    async def understand_intent(self, text: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        意图理解 (GPT API)
        
        Args:
            text: 用户输入文本
            context: 上下文信息（如餐厅信息、当前时间等）
            
        Returns:
            意图分析结果 {
                "intent": "reservation" | "order" | "inquiry" | "complaint" | "other",
                "entities": {...},
                "confidence": 0.95,
                "suggested_response": "..."
            }
        """
        if not self.openai_api_key:
            # Demo 模式
            return self._demo_intent_understanding(text)
        
        system_prompt = """你是一个餐厅AI助手，负责理解顾客的意图。
请分析顾客的话语，返回JSON格式的结果：
{
    "intent": "reservation" | "order" | "inquiry" | "complaint" | "other",
    "entities": {
        "date": "日期",
        "time": "时间",
        "party_size": 人数,
        "dishes": ["菜品列表"],
        "special_requests": "特殊要求"
    },
    "confidence": 0.0-1.0,
    "suggested_response": "建议的回复"
}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ]
        
        if context:
            messages.insert(1, {
                "role": "system", 
                "content": f"餐厅信息: {json.dumps(context, ensure_ascii=False)}"
            })
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.openai_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4",
                    "messages": messages,
                    "temperature": 0.3,
                    "response_format": {"type": "json_object"}
                }
            )
            
            if response.status_code == 200:
                content = response.json()["choices"][0]["message"]["content"]
                return json.loads(content)
            else:
                raise Exception(f"GPT API error: {response.text}")
    
    def _demo_intent_understanding(self, text: str) -> Dict[str, Any]:
        """Demo 模式的意图理解"""
        text_lower = text.lower()
        
        if "预订" in text or "预约" in text or "订位" in text:
            return {
                "intent": "reservation",
                "entities": {
                    "date": "今天",
                    "time": "19:00",
                    "party_size": 4
                },
                "confidence": 0.92,
                "suggested_response": "好的，为您预订今晚7点4位用餐，请问贵姓？"
            }
        elif "点菜" in text or "外卖" in text or "打包" in text:
            return {
                "intent": "order",
                "entities": {
                    "order_type": "takeout" if "外卖" in text or "打包" in text else "dine_in"
                },
                "confidence": 0.88,
                "suggested_response": "好的，请问您想点什么菜品？"
            }
        elif "营业" in text or "地址" in text or "时间" in text:
            return {
                "intent": "inquiry",
                "entities": {
                    "query_type": "business_hours" if "营业" in text or "时间" in text else "location"
                },
                "confidence": 0.95,
                "suggested_response": "我们的营业时间是上午11点到晚上10点，地址是..."
            }
        else:
            return {
                "intent": "other",
                "entities": {},
                "confidence": 0.5,
                "suggested_response": "请问有什么可以帮您的？"
            }
    
    async def generate_response(
        self, 
        intent_result: Dict[str, Any],
        restaurant_info: Dict[str, Any]
    ) -> str:
        """
        生成AI回复
        
        Args:
            intent_result: 意图理解结果
            restaurant_info: 餐厅信息
            
        Returns:
            生成的回复文本
        """
        if not self.openai_api_key:
            return intent_result.get("suggested_response", "请问有什么可以帮您的？")
        
        system_prompt = f"""你是{restaurant_info.get('name', '餐厅')}的AI客服。
请根据顾客意图生成友好、专业的回复。
餐厅信息: {json.dumps(restaurant_info, ensure_ascii=False)}
顾客意图: {json.dumps(intent_result, ensure_ascii=False)}"""

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.openai_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": "请生成回复"}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 200
                }
            )
            
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"]
            else:
                return intent_result.get("suggested_response", "请问有什么可以帮您的？")


class TwilioService:
    """Twilio 电话服务集成"""
    
    def __init__(self):
        self.account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
        self.auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
        self.phone_number = getattr(settings, 'TWILIO_PHONE_NUMBER', None)
    
    async def handle_incoming_call(self, from_number: str, to_number: str) -> Dict[str, Any]:
        """
        处理来电
        
        Args:
            from_number: 来电号码
            to_number: 被叫号码
            
        Returns:
            TwiML 响应配置
        """
        # TODO: 实际的 Twilio 集成
        return {
            "action": "gather",
            "message": "您好，欢迎致电餐厅。请说出您的需求，或按1预订座位，按2查询外卖，按3转人工服务。",
            "timeout": 5,
            "language": "zh-CN"
        }
    
    async def make_outbound_call(self, to_number: str, message: str) -> bool:
        """
        拨打外呼电话（如预订确认）
        
        Args:
            to_number: 目标号码
            message: 播报内容
            
        Returns:
            是否成功
        """
        if not all([self.account_sid, self.auth_token, self.phone_number]):
            print(f"[Demo] 拨打 {to_number}: {message}")
            return True
        
        # TODO: 实际的 Twilio 外呼实现
        return True
    
    async def send_sms(self, to_number: str, message: str) -> bool:
        """
        发送短信
        
        Args:
            to_number: 目标号码
            message: 短信内容
            
        Returns:
            是否成功
        """
        if not all([self.account_sid, self.auth_token, self.phone_number]):
            print(f"[Demo] 发送短信到 {to_number}: {message}")
            return True
        
        # TODO: 实际的 Twilio SMS 实现
        return True
