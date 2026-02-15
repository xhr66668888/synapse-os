"""Agent API 端点 - AI 助手接口"""

import uuid
import base64
import json
from typing import Dict, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.responses import JSONResponse

from app.schemas.agent import (
    AgentCommandRequest,
    AgentCommandResponse,
    AgentActionSchema,
    TranscribeRequest,
    TranscribeResponse,
    WSMessage,
    WSMessageType,
    AgentSessionInfo,
)
from app.services.web_agent import WebAgent, WebAgentConfig, AgentAction
from app.services.zhipu_client import ZhipuConfig
from app.services.whisper_service import get_whisper_service
from app.services.dual_agent_service import get_dual_agent_service
from app.services.triple_agent_service import get_triple_agent_service
from app.services.task_decomposer import TaskDecomposer

router = APIRouter(prefix="/agent", tags=["AI Agent"])

# 存储活跃的 Agent 会话
_agent_sessions: Dict[str, WebAgent] = {}
_session_info: Dict[str, AgentSessionInfo] = {}


def _get_or_create_session(session_id: Optional[str] = None) -> tuple[str, WebAgent]:
    """获取或创建 Agent 会话"""
    if session_id and session_id in _agent_sessions:
        return session_id, _agent_sessions[session_id]
    
    # 创建新会话
    new_id = str(uuid.uuid4())
    agent = WebAgent(
        zhipu_config=ZhipuConfig(),
        agent_config=WebAgentConfig(max_steps=50, verbose=True)
    )
    _agent_sessions[new_id] = agent
    _session_info[new_id] = AgentSessionInfo(
        session_id=new_id,
        created_at=datetime.now().isoformat(),
        step_count=0,
        status="active"
    )
    
    return new_id, agent


def _action_to_schema(action: AgentAction) -> AgentActionSchema:
    """将 AgentAction 转换为 Schema"""
    return AgentActionSchema(
        type=action.type,
        params=action.params,
        message=action.message,
        requires_confirmation=action.requires_confirmation
    )


# ============== REST API ==============

@router.post("/command", response_model=AgentCommandResponse)
async def process_command(request: AgentCommandRequest):
    """
    处理用户指令
    
    发送自然语言指令，Agent 返回下一步操作
    """
    try:
        session_id, agent = _get_or_create_session(request.session_id)
        
        result = await agent.process_command(
            user_command=request.command,
            screenshot_base64=request.screenshot,
            current_page=request.current_page
        )
        
        # 更新会话信息
        if session_id in _session_info:
            _session_info[session_id].step_count = agent.step_count
            _session_info[session_id].last_command = request.command
            if result.finished:
                _session_info[session_id].status = "completed"
        
        return AgentCommandResponse(
            success=result.success,
            action=_action_to_schema(result.action) if result.action else None,
            thinking=result.thinking,
            message=result.message,
            finished=result.finished,
            session_id=session_id,
            step_count=agent.step_count
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(request: TranscribeRequest):
    """
    语音转文字
    
    将音频转换为文字，用于语音指令输入
    """
    try:
        # 解码 Base64 音频
        audio_data = base64.b64decode(request.audio_base64)
        
        # 调用 Whisper 服务
        whisper = get_whisper_service()
        result = await whisper.transcribe(
            audio_data=audio_data,
            language=request.language,
            format=request.format
        )
        
        return TranscribeResponse(
            success=result.success,
            text=result.text,
            language=result.language,
            error=result.error
        )
        
    except Exception as e:
        return TranscribeResponse(
            success=False,
            text="",
            language="",
            error=str(e)
        )


@router.post("/transcribe/upload", response_model=TranscribeResponse)
async def transcribe_upload(
    file: UploadFile = File(...),
    language: str = Form("zh")
):
    """
    上传音频文件进行转写
    """
    try:
        audio_data = await file.read()
        format = file.filename.split(".")[-1] if file.filename else "webm"
        
        whisper = get_whisper_service()
        result = await whisper.transcribe(
            audio_data=audio_data,
            language=language,
            format=format
        )
        
        return TranscribeResponse(
            success=result.success,
            text=result.text,
            language=result.language,
            error=result.error
        )
        
    except Exception as e:
        return TranscribeResponse(
            success=False,
            text="",
            language="",
            error=str(e)
        )


@router.get("/session/{session_id}")
async def get_session_info(session_id: str):
    """获取会话信息"""
    if session_id not in _session_info:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return _session_info[session_id]


@router.delete("/session/{session_id}")
async def close_session(session_id: str):
    """关闭会话"""
    if session_id in _agent_sessions:
        del _agent_sessions[session_id]
    if session_id in _session_info:
        del _session_info[session_id]
    
    return {"success": True, "message": "Session closed"}


@router.get("/sessions")
async def list_sessions():
    """列出所有活跃会话"""
    return list(_session_info.values())


# ============== WebSocket ==============

class AgentWebSocketHandler:
    """Agent WebSocket 处理器"""
    
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.session_id: Optional[str] = None
        self.agent: Optional[WebAgent] = None
    
    async def connect(self):
        """建立连接"""
        await self.websocket.accept()
    
    async def disconnect(self):
        """断开连接"""
        if self.session_id and self.session_id in _session_info:
            _session_info[self.session_id].status = "disconnected"
    
    async def send_message(self, msg_type: WSMessageType, data: dict):
        """发送消息"""
        message = WSMessage(
            type=msg_type,
            data=data,
            session_id=self.session_id
        )
        await self.websocket.send_json(message.model_dump())
    
    async def handle_message(self, message: dict):
        """处理接收到的消息"""
        try:
            msg_type = WSMessageType(message.get("type", ""))
            data = message.get("data", {})
            
            if msg_type == WSMessageType.COMMAND:
                await self._handle_command(data)
            elif msg_type == WSMessageType.SCREENSHOT:
                await self._handle_screenshot(data)
            elif msg_type == WSMessageType.ACTION_RESULT:
                await self._handle_action_result(data)
            elif msg_type == WSMessageType.CONFIRM_RESPONSE:
                await self._handle_confirm(data)
            elif msg_type == WSMessageType.CANCEL:
                await self._handle_cancel()
                
        except Exception as e:
            await self.send_message(WSMessageType.ERROR, {"error": str(e)})
    
    async def _handle_command(self, data: dict):
        """处理用户指令"""
        command = data.get("command", "")
        screenshot = data.get("screenshot")
        current_page = data.get("current_page", "/")
        
        # 获取或创建会话
        self.session_id, self.agent = _get_or_create_session(self.session_id)
        
        # 处理指令
        result = await self.agent.process_command(
            user_command=command,
            screenshot_base64=screenshot,
            current_page=current_page
        )
        
        # 发送思考过程
        if result.thinking:
            await self.send_message(WSMessageType.THINKING, {
                "thinking": result.thinking,
                "step": self.agent.step_count
            })
        
        if result.finished:
            await self.send_message(WSMessageType.FINISHED, {
                "message": result.message or "任务完成",
                "total_steps": self.agent.step_count
            })
        elif result.action:
            if result.action.requires_confirmation:
                await self.send_message(WSMessageType.REQUEST_CONFIRM, {
                    "message": result.action.message or "确认操作?",
                    "action": _action_to_schema(result.action).model_dump()
                })
            else:
                await self.send_message(WSMessageType.ACTION, {
                    "action": _action_to_schema(result.action).model_dump(),
                    "step": self.agent.step_count
                })
    
    async def _handle_screenshot(self, data: dict):
        """处理截图上传 - 用于继续执行"""
        screenshot = data.get("screenshot")
        current_page = data.get("current_page", "/")
        
        if not self.agent:
            await self.send_message(WSMessageType.ERROR, {"error": "No active session"})
            return
        
        # 继续处理（无新指令）
        result = await self.agent.process_command(
            user_command="",
            screenshot_base64=screenshot,
            current_page=current_page
        )
        
        if result.thinking:
            await self.send_message(WSMessageType.THINKING, {
                "thinking": result.thinking,
                "step": self.agent.step_count
            })
        
        if result.finished:
            await self.send_message(WSMessageType.FINISHED, {
                "message": result.message or "任务完成",
                "total_steps": self.agent.step_count
            })
        elif result.action:
            await self.send_message(WSMessageType.ACTION, {
                "action": _action_to_schema(result.action).model_dump(),
                "step": self.agent.step_count
            })
    
    async def _handle_action_result(self, data: dict):
        """处理操作执行结果"""
        success = data.get("success", False)
        error = data.get("error")
        
        if not success:
            await self.send_message(WSMessageType.ERROR, {
                "error": f"操作执行失败: {error}"
            })
        else:
            # 请求新的截图以继续
            await self.send_message(WSMessageType.REQUEST_SCREENSHOT, {
                "message": "请提供当前页面截图"
            })
    
    async def _handle_confirm(self, data: dict):
        """处理用户确认"""
        confirmed = data.get("confirmed", False)
        
        if not confirmed:
            await self.send_message(WSMessageType.FINISHED, {
                "message": "用户取消操作",
                "total_steps": self.agent.step_count if self.agent else 0
            })
        else:
            # 用户确认，继续执行
            await self.send_message(WSMessageType.REQUEST_SCREENSHOT, {
                "message": "请执行操作后提供截图"
            })
    
    async def _handle_cancel(self):
        """处理取消任务"""
        if self.agent:
            self.agent.reset()
        
        await self.send_message(WSMessageType.FINISHED, {
            "message": "任务已取消",
            "total_steps": 0
        })


@router.websocket("/ws")
async def agent_websocket(websocket: WebSocket):
    """
    Agent WebSocket 端点
    
    支持实时双向通信的 Agent 交互
    """
    handler = AgentWebSocketHandler(websocket)
    await handler.connect()
    
    try:
        while True:
            data = await websocket.receive_json()
            await handler.handle_message(data)
            
    except WebSocketDisconnect:
        await handler.disconnect()
    except Exception as e:
        try:
            await handler.send_message(WSMessageType.ERROR, {"error": str(e)})
        except:
            pass
        await handler.disconnect()


# ============== Multi-Task API ==============

@router.post("/multi-task")
async def process_multi_task(
    command: str = Form(...),
    screenshot: str = Form(None),
    current_page: str = Form(None),
):
    """
    处理多任务复合指令
    
    将复合指令 (如 "下架宫保鸡丁，给3桌结账") 分解为子任务并执行
    
    Args:
        command: 复合指令
        screenshot: 当前截图 (Base64)
        current_page: 当前页面路径
        
    Returns:
        多任务执行结果
    """
    try:
        dual_agent = get_dual_agent_service()
        
        # 分解任务
        tasks = await dual_agent.task_decomposer.decompose(command)
        
        if not tasks:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "无法识别任务",
                    "command": command,
                }
            )
        
        # 解码截图
        screenshot_bytes = None
        if screenshot:
            screenshot_bytes = base64.b64decode(screenshot)
        
        # 获取 Provider 并执行每个任务
        results = []
        for task in tasks:
            provider = await dual_agent.route_task(task)
            
            response = await provider.predict(
                task.to_instruction(),
                screenshots=[screenshot_bytes] if screenshot_bytes else None,
                context={"page_path": current_page},
            )
            
            results.append({
                "task_id": task.id,
                "task_type": task.type.value,
                "action": task.action,
                "target": task.target,
                "instruction": task.to_instruction(),
                "response": {
                    "thinking": response.thinking,
                    "action": response.action,
                    "success": response.success,
                    "error": response.error,
                },
            })
        
        return {
            "success": True,
            "command": command,
            "tasks_count": len(tasks),
            "tasks": results,
            "summary": dual_agent.task_decomposer.get_task_summary(tasks),
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@router.post("/decompose")
async def decompose_command(command: str = Form(...)):
    """
    预览任务分解结果
    
    仅分解任务，不执行，用于预览和确认
    
    Args:
        command: 复合指令
        
    Returns:
        分解后的子任务列表
    """
    try:
        decomposer = TaskDecomposer()
        tasks = await decomposer.decompose(command)
        
        return {
            "success": True,
            "command": command,
            "tasks_count": len(tasks),
            "tasks": [t.to_dict() for t in tasks],
            "summary": decomposer.get_task_summary(tasks),
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@router.get("/providers")
async def list_providers():
    """
    列出可用的 AI 模型
    
    Returns:
        可用的 Agent 列表及其状态
    """
    try:
        dual_agent = get_dual_agent_service()
        providers = dual_agent.list_providers()
        
        return {
            "success": True,
            "providers": providers,
            "default": dual_agent.config.default_agent,
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@router.post("/providers/switch")
async def switch_provider(provider_name: str = Form(...)):
    """
    切换默认 AI 模型
    
    Args:
        provider_name: 模型名称 (autoglm 或 mobile_agent)
        
    Returns:
        切换结果
    """
    try:
        dual_agent = get_dual_agent_service()
        success = dual_agent.set_default_provider(provider_name)
        
        if success:
            return {
                "success": True,
                "message": f"已切换到 {provider_name}",
                "default": provider_name,
            }
        else:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": f"无效的模型名称: {provider_name}",
                    "valid_names": ["autoglm", "mobile_agent"],
                }
            )
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@router.post("/smart-command")
async def smart_command(
    command: str = Form(...),
    screenshot: str = Form(None),
    current_page: str = Form(None),
    enable_fallback: bool = Form(True),
):
    """
    智能命令处理 (带回退机制)
    
    使用双模型服务处理命令，主模型失败时自动回退
    
    Args:
        command: 用户指令
        screenshot: 当前截图 (Base64)
        current_page: 当前页面路径
        enable_fallback: 是否启用回退
        
    Returns:
        Agent 响应
    """
    try:
        dual_agent = get_dual_agent_service()
        
        # 解码截图
        screenshot_bytes = None
        if screenshot:
            screenshot_bytes = base64.b64decode(screenshot)
        
        # 执行命令
        if enable_fallback:
            response = await dual_agent.execute_with_fallback(
                command,
                screenshot=screenshot_bytes,
                page_path=current_page,
            )
        else:
            response = await dual_agent.execute_command(
                command,
                screenshot=screenshot_bytes,
                page_path=current_page,
            )
        
        return {
            "success": response.success,
            "thinking": response.thinking,
            "action": response.action,
            "raw_content": response.raw_content,
            "error": response.error,
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


# ============== Triple Agent API ==============

@router.post("/triple/execute")
async def triple_execute(
    command: str = Form(...),
    screenshot: str = Form(None),
    current_page: str = Form(None),
    force_provider: str = Form(None),
):
    """
    使用三模型服务执行指令
    
    智能路由到 AutoGLM、MobileAgent 或 UI-TARS
    
    Args:
        command: 用户指令
        screenshot: 当前截图 (Base64)
        current_page: 当前页面路径
        force_provider: 强制使用指定模型 (autoglm/mobile_agent/ui_tars)
        
    Returns:
        执行结果，包含使用的模型和成本估算
    """
    try:
        triple_agent = get_triple_agent_service()
        
        # 解码截图
        screenshot_bytes = None
        if screenshot:
            screenshot_bytes = base64.b64decode(screenshot)
        
        # 执行
        result = await triple_agent.execute(
            command,
            screenshot=screenshot_bytes,
            page_path=current_page,
            force_provider=force_provider,
        )
        
        return result.to_dict()
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@router.post("/triple/multi-task")
async def triple_multi_task(
    command: str = Form(...),
    screenshot: str = Form(None),
    current_page: str = Form(None),
):
    """
    使用三模型服务执行多任务指令
    
    分解复合指令并智能路由每个子任务
    
    Args:
        command: 复合指令 (如 "下架宫保鸡丁，给3桌结账")
        screenshot: 当前截图 (Base64)
        current_page: 当前页面路径
        
    Returns:
        多任务执行结果
    """
    try:
        triple_agent = get_triple_agent_service()
        
        # 解码截图
        screenshot_bytes = None
        if screenshot:
            screenshot_bytes = base64.b64decode(screenshot)
        
        # 执行多任务
        result = await triple_agent.execute_multi_task(
            command,
            screenshot=screenshot_bytes,
            page_path=current_page,
        )
        
        return result
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@router.get("/triple/providers")
async def triple_list_providers():
    """
    列出三模型服务的所有 Provider 状态
    
    Returns:
        Provider 列表，包含可用性和成本信息
    """
    try:
        triple_agent = get_triple_agent_service()
        providers = triple_agent.list_providers()
        
        return {
            "success": True,
            "providers": providers,
            "routing_strategy": triple_agent.config.routing_strategy.value,
            "default_agent": triple_agent.config.default_agent,
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@router.post("/triple/strategy")
async def triple_set_strategy(strategy: str = Form(...)):
    """
    设置路由策略
    
    Args:
        strategy: 路由策略
            - cost_optimized: 成本优先 (AutoGLM → MobileAgent → UI-TARS)
            - performance_first: 性能优先 (UI-TARS → MobileAgent → AutoGLM)
            - balanced: 平衡模式
            - autoglm_only / mobile_agent_only / ui_tars_only: 仅使用单一模型
            
    Returns:
        设置结果
    """
    try:
        triple_agent = get_triple_agent_service()
        success = triple_agent.set_routing_strategy(strategy)
        
        if success:
            return {
                "success": True,
                "message": f"路由策略已设置为 {strategy}",
                "routing_strategy": strategy,
            }
        else:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": f"无效的策略: {strategy}",
                    "valid_strategies": [
                        "cost_optimized",
                        "performance_first",
                        "balanced",
                        "autoglm_only",
                        "mobile_agent_only",
                        "ui_tars_only",
                    ],
                }
            )
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@router.post("/triple/assess")
async def triple_assess_complexity(command: str = Form(...)):
    """
    评估指令复杂度
    
    用于调试和了解路由决策
    
    Args:
        command: 用户指令
        
    Returns:
        复杂度评估和推荐的 Provider
    """
    try:
        triple_agent = get_triple_agent_service()
        
        complexity = triple_agent.assess_complexity(command)
        recommended = triple_agent.select_provider(command)
        
        return {
            "success": True,
            "command": command,
            "complexity": complexity.value,
            "recommended_provider": recommended,
            "fallback_chain": triple_agent.get_fallback_chain(recommended),
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


# ============== Screenshot API ==============

@router.post("/screenshot")
async def receive_screenshot(
    screenshot: str = Form(...),
    session_id: str = Form(None),
    page_path: str = Form(None),
):
    """
    接收前端截图
    
    Args:
        screenshot: Base64 编码的截图
        session_id: 会话 ID
        page_path: 当前页面路径
        
    Returns:
        截图 ID 和尺寸信息
    """
    try:
        from app.services.screenshot_service import get_screenshot_service
        
        service = get_screenshot_service()
        result = service.receive(screenshot, session_id, page_path)
        
        return {
            "success": True,
            "id": result.id,
            "width": result.width,
            "height": result.height,
            "timestamp": result.timestamp,
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@router.get("/screenshot/{screenshot_id}")
async def get_screenshot(screenshot_id: str):
    """
    获取截图信息
    
    Args:
        screenshot_id: 截图 ID
        
    Returns:
        截图元数据
    """
    try:
        from app.services.screenshot_service import get_screenshot_service
        
        service = get_screenshot_service()
        screenshot = service.get(screenshot_id)
        
        if not screenshot:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Screenshot not found"}
            )
        
        return {
            "success": True,
            **screenshot.to_dict(),
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


# ============== Notetaker API ==============

@router.post("/notetaker/start")
async def start_task_recording(
    task_id: str = Form(...),
    instruction: str = Form(...),
):
    """
    开始任务记录
    
    Args:
        task_id: 任务 ID
        instruction: 用户指令
    """
    try:
        from app.services.notetaker_agent import get_notetaker
        
        notetaker = get_notetaker()
        memory = notetaker.start_task(task_id, instruction)
        
        return {
            "success": True,
            "task_id": memory.task_id,
            "started_at": memory.started_at,
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@router.post("/notetaker/record")
async def record_task_step(
    task_id: str = Form(...),
    step_index: int = Form(...),
    action: str = Form(...),
    action_params: str = Form("{}"),
    result: str = Form(...),
    success: bool = Form(...),
    screenshot_id: str = Form(None),
    duration_ms: int = Form(0),
):
    """
    记录任务步骤
    
    Args:
        task_id: 任务 ID
        step_index: 步骤索引
        action: 操作类型
        action_params: 操作参数 (JSON)
        result: 执行结果
        success: 是否成功
        screenshot_id: 截图 ID
        duration_ms: 执行时长
    """
    try:
        from app.services.notetaker_agent import get_notetaker
        
        notetaker = get_notetaker()
        params = json.loads(action_params) if action_params else {}
        
        note = notetaker.record(
            task_id=task_id,
            step_index=step_index,
            action=action,
            action_params=params,
            result=result,
            success=success,
            screenshot_id=screenshot_id,
            duration_ms=duration_ms,
        )
        
        return {
            "success": True,
            "note": note.to_dict(),
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@router.get("/notetaker/context/{task_id}")
async def get_task_context(task_id: str):
    """
    获取任务上下文
    
    用于 AI 决策时的历史参考
    """
    try:
        from app.services.notetaker_agent import get_notetaker
        
        notetaker = get_notetaker()
        context = notetaker.get_context(task_id)
        
        return {
            "success": True,
            "context": context,
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@router.get("/notetaker/similar")
async def find_similar_tasks(instruction: str):
    """
    查找相似的历史任务
    
    用于学习之前的成功经验
    """
    try:
        from app.services.notetaker_agent import get_notetaker
        
        notetaker = get_notetaker()
        similar = notetaker.find_similar_tasks(instruction)
        
        return {
            "success": True,
            "tasks": [t.to_dict() for t in similar],
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


# ============== Reflector API ==============

@router.post("/reflector/analyze")
async def analyze_action_result(
    instruction: str = Form(...),
    action: str = Form(...),
    before_screenshot: str = Form(None),
    after_screenshot: str = Form(None),
):
    """
    分析操作结果
    
    对比操作前后截图，判断操作是否成功
    
    Args:
        instruction: 用户指令
        action: 执行的操作 (JSON)
        before_screenshot: 操作前截图 (Base64)
        after_screenshot: 操作后截图 (Base64)
    """
    try:
        from app.services.reflector_agent import get_reflector
        
        reflector = get_reflector()
        action_dict = json.loads(action) if action else {}
        
        # 解码截图
        before_bytes = base64.b64decode(before_screenshot.split(",")[-1]) if before_screenshot else None
        after_bytes = base64.b64decode(after_screenshot.split(",")[-1]) if after_screenshot else None
        
        result = await reflector.analyze(
            instruction=instruction,
            action_taken=action_dict,
            before_screenshot=before_bytes,
            after_screenshot=after_bytes,
        )
        
        return {
            "success": True,
            "result": result.to_dict(),
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@router.post("/reflector/quick-check")
async def quick_check_action(
    action: str = Form(...),
    before_screenshot: str = Form(None),
    after_screenshot: str = Form(None),
):
    """
    快速检查操作是否成功 (不调用 AI)
    
    基于截图相似度判断
    """
    try:
        from app.services.reflector_agent import get_reflector
        
        reflector = get_reflector()
        action_dict = json.loads(action) if action else {}
        
        before_bytes = base64.b64decode(before_screenshot.split(",")[-1]) if before_screenshot else None
        after_bytes = base64.b64decode(after_screenshot.split(",")[-1]) if after_screenshot else None
        
        success = await reflector.quick_check(action_dict, before_bytes, after_bytes)
        
        return {
            "success": True,
            "action_success": success,
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

