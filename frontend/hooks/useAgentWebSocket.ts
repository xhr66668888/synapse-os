/**
 * Agent WebSocket 通信 Hook
 * 
 * 用于与后端 Agent 进行实时通信
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAIAssistantStore, AgentAction, ExecutionStep } from '@/lib/ai-assistant-store';
import { getAgentExecutor, captureScreen, getCurrentPage } from '@/lib/agent-executor';

// WebSocket 消息类型
type WSMessageType =
    | 'command'
    | 'screenshot'
    | 'action_result'
    | 'confirm'
    | 'cancel'
    | 'action'
    | 'thinking'
    | 'request_screenshot'
    | 'request_confirm'
    | 'finished'
    | 'error';

interface WSMessage {
    type: WSMessageType;
    data: Record<string, any>;
    session_id?: string;
}

interface UseAgentWebSocketOptions {
    autoConnect?: boolean;
    onAction?: (action: AgentAction) => void;
    onFinished?: (message: string) => void;
    onError?: (error: string) => void;
}

export function useAgentWebSocket(options: UseAgentWebSocketOptions = {}) {
    const { autoConnect = false, onAction, onFinished, onError } = options;
    
    const router = useRouter();
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    
    const {
        command,
        setSessionId,
        setProcessing,
        setExecuting,
        addStep,
        updateStepStatus,
        setPendingConfirmation,
        setResult,
        setError,
        reset,
    } = useAIAssistantStore();

    const executor = getAgentExecutor();

    // 连接 WebSocket
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            // 构建 WebSocket URL
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, '') || 'localhost:8000';
            const wsUrl = `${protocol}//${host}/api/v1/agent/ws`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('Agent WebSocket connected');
                setIsConnected(true);
                setConnectionError(null);
            };

            ws.onclose = () => {
                console.log('Agent WebSocket disconnected');
                setIsConnected(false);
            };

            ws.onerror = (error) => {
                console.error('Agent WebSocket error:', error);
                setConnectionError('WebSocket 连接失败');
                setIsConnected(false);
            };

            ws.onmessage = (event) => {
                try {
                    const message: WSMessage = JSON.parse(event.data);
                    handleMessage(message);
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            setConnectionError('无法创建 WebSocket 连接');
        }
    }, []);

    // 断开连接
    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    // 发送消息
    const sendMessage = useCallback((type: WSMessageType, data: Record<string, any>) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type, data }));
        } else {
            console.error('WebSocket not connected');
        }
    }, []);

    // 处理接收到的消息
    const handleMessage = useCallback(async (message: WSMessage) => {
        const { type, data, session_id } = message;

        if (session_id) {
            setSessionId(session_id);
        }

        switch (type) {
            case 'thinking':
                // 收到思考过程
                console.log('Agent thinking:', data.thinking);
                break;

            case 'action':
                // 收到操作指令
                setProcessing(false);
                setExecuting(true);
                
                const action: AgentAction = data.action;
                const step = data.step || 0;

                // 添加到执行步骤
                const stepId = `step-${Date.now()}`;
                const executionStep: ExecutionStep = {
                    id: stepId,
                    action,
                    thinking: data.thinking || '',
                    status: 'executing',
                    timestamp: Date.now(),
                };
                addStep(executionStep);

                // 回调
                onAction?.(action);

                // 执行操作
                try {
                    const result = await executor.executeWithScreenshot(action);
                    
                    if (result.success) {
                        updateStepStatus(stepId, 'completed');
                        
                        // 发送执行结果和新截图
                        sendMessage('action_result', {
                            success: true,
                            screenshot: result.screenshot,
                            current_page: getCurrentPage(),
                        });
                    } else {
                        updateStepStatus(stepId, 'failed', result.error);
                        sendMessage('action_result', {
                            success: false,
                            error: result.error,
                        });
                    }
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    updateStepStatus(stepId, 'failed', errorMsg);
                    sendMessage('action_result', {
                        success: false,
                        error: errorMsg,
                    });
                }
                break;

            case 'request_screenshot':
                // 请求截图
                const screenshot = await captureScreen();
                sendMessage('screenshot', {
                    screenshot,
                    current_page: getCurrentPage(),
                });
                break;

            case 'request_confirm':
                // 请求用户确认
                setExecuting(false);
                setPendingConfirmation({
                    message: data.message,
                    action: data.action,
                });
                break;

            case 'finished':
                // 任务完成
                setExecuting(false);
                setResult(data.message);
                onFinished?.(data.message);
                break;

            case 'error':
                // 错误
                setExecuting(false);
                setProcessing(false);
                setError(data.error);
                onError?.(data.error);
                break;
        }
    }, [
        setSessionId, setProcessing, setExecuting, addStep, updateStepStatus,
        setPendingConfirmation, setResult, setError, sendMessage, executor,
        onAction, onFinished, onError
    ]);

    // 发送指令
    const sendCommand = useCallback(async (userCommand: string) => {
        if (!isConnected) {
            connect();
            // 等待连接
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setProcessing(true);

        // 获取当前截图
        const screenshot = await captureScreen();

        sendMessage('command', {
            command: userCommand,
            screenshot,
            current_page: getCurrentPage(),
        });
    }, [isConnected, connect, sendMessage, setProcessing]);

    // 发送确认结果
    const sendConfirmation = useCallback((confirmed: boolean) => {
        setPendingConfirmation(null);
        
        if (confirmed) {
            sendMessage('confirm', { confirmed: true });
        } else {
            sendMessage('confirm', { confirmed: false });
        }
    }, [sendMessage, setPendingConfirmation]);

    // 取消任务
    const cancelTask = useCallback(() => {
        sendMessage('cancel', {});
        reset();
    }, [sendMessage, reset]);

    // 自动连接
    useEffect(() => {
        if (autoConnect) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [autoConnect, connect, disconnect]);

    // 监听 command 变化并发送
    useEffect(() => {
        if (command && isConnected) {
            sendCommand(command);
        }
    }, [command, isConnected, sendCommand]);

    // 设置路由器到执行器
    useEffect(() => {
        executor.setRouter(router);
    }, [router, executor]);

    return {
        isConnected,
        connectionError,
        connect,
        disconnect,
        sendCommand,
        sendConfirmation,
        cancelTask,
    };
}
