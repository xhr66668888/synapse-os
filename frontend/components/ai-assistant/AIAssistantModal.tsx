'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    X,
    Send,
    Loader2,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    User,
    Wifi,
    WifiOff,
    Zap,
    Brain,
    Eye,
    DollarSign,
    ListChecks,
    Settings2
} from 'lucide-react';
import { useAIAssistantStore, SubTaskInfo } from '@/lib/ai-assistant-store';
import { VoiceRecorder } from './VoiceRecorder';
import { ExecutionTimeline } from './ExecutionTimeline';
import { tripleAgent, AIProvider } from '@/lib/api';

// Provider 图标映射
const ProviderIcons: Record<string, typeof Brain> = {
    autoglm: Zap,
    mobile_agent: Brain,
    ui_tars: Eye,
};

// Provider 名称映射
const ProviderNames: Record<string, string> = {
    autoglm: 'AutoGLM',
    mobile_agent: 'MobileAgent',
    ui_tars: 'UI-TARS',
};

function ConnectionStatus({ isConnected, connectionError }: { isConnected: boolean; connectionError: string | null }) {
    const baseClass = "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]";

    if (isConnected) {
        return (
            <div className={`${baseClass} bg-green-100 text-green-700`}>
                <Wifi className="w-3 h-3" />
                <span>已连接</span>
            </div>
        );
    }

    if (connectionError) {
        return (
            <div className={`${baseClass} bg-red-100 text-red-700`}>
                <WifiOff className="w-3 h-3" />
                <span>连接失败</span>
            </div>
        );
    }

    return (
        <div className={`${baseClass} bg-gray-100 text-gray-600`}>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>连接中</span>
        </div>
    );
}

// Provider 状态徽章
function ProviderBadge({ provider, isActive }: { provider: AIProvider; isActive: boolean }) {
    const Icon = ProviderIcons[provider.name] || Brain;
    const name = ProviderNames[provider.name] || provider.name;

    return (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isActive
                ? 'bg-primary/10 text-primary border border-primary/30'
                : provider.available
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-gray-50 text-gray-400'
            }`}>
            <Icon className="w-3 h-3" />
            <span>{name}</span>
            {provider.is_default && <span className="text-[8px] bg-primary/20 px-1 rounded">默认</span>}
        </div>
    );
}

// 多任务进度
function MultiTaskProgress({ tasks, currentIndex }: { tasks: SubTaskInfo[]; currentIndex: number }) {
    if (tasks.length <= 1) return null;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-text-muted">
                <ListChecks className="w-4 h-4" />
                <span>多任务执行 ({currentIndex + 1}/{tasks.length})</span>
            </div>
            <div className="space-y-1">
                {tasks.map((task, idx) => (
                    <div
                        key={task.id}
                        className={`flex items-center gap-2 p-2 rounded-lg text-sm ${idx === currentIndex
                                ? 'bg-blue-50 border border-blue-200'
                                : task.status === 'completed'
                                    ? 'bg-green-50'
                                    : task.status === 'failed'
                                        ? 'bg-red-50'
                                        : 'bg-gray-50'
                            }`}
                    >
                        {task.status === 'running' ? (
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        ) : task.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : task.status === 'failed' ? (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                        ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                        )}
                        <span className={task.status === 'completed' ? 'text-green-700' : task.status === 'failed' ? 'text-red-700' : ''}>
                            {task.instruction}
                        </span>
                        {task.provider && (
                            <span className="ml-auto text-xs text-gray-400">{ProviderNames[task.provider] || task.provider}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// 成本显示
function CostDisplay({ cost }: { cost: number }) {
    if (cost <= 0) return null;

    return (
        <div className="flex items-center gap-1 text-xs text-gray-500">
            <DollarSign className="w-3 h-3" />
            <span>约 ¥{cost.toFixed(3)}</span>
        </div>
    );
}

export function AIAssistantModal() {
    const {
        isOpen,
        isProcessing,
        isExecuting,
        command,
        steps,
        result,
        error,
        pendingConfirmation,
        subTasks,
        currentTaskIndex,
        isMultiTask,
        providers,
        currentProvider,
        totalCost,
        close,
        reset,
        setCommand,
        setProcessing,
        setExecuting,
        setProviders,
        setCurrentProvider,
        setSubTasks,
        updateSubTaskStatus,
        setCurrentTaskIndex,
        setResult,
        setError,
        addCost,
    } = useAIAssistantStore();

    const [inputValue, setInputValue] = useState('');
    const [showHistory, setShowHistory] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // 加载 Provider 状态
    const loadProviders = useCallback(async () => {
        try {
            const data = await tripleAgent.getProviders();
            if (data.success) {
                setProviders(data.providers);
                setIsConnected(true);
                setConnectionError(null);
            }
        } catch (err) {
            setConnectionError('无法连接到 AI 服务');
            setIsConnected(false);
        }
    }, [setProviders]);

    useEffect(() => {
        if (isOpen) {
            loadProviders();
        }
    }, [isOpen, loadProviders]);

    // 执行指令
    const executeCommand = async (cmd: string) => {
        setCommand(cmd);
        setProcessing(true);

        try {
            // 先尝试分解任务
            const decomposed = await tripleAgent.decompose(cmd);

            if (decomposed.success && decomposed.tasks_count > 1) {
                // 多任务模式
                const taskInfos: SubTaskInfo[] = decomposed.tasks.map((t) => ({
                    id: t.id,
                    type: t.type,
                    instruction: `${t.action} ${t.target}`,
                    status: 'pending' as const,
                }));
                setSubTasks(taskInfos);
                setProcessing(false);
                setExecuting(true);

                // 执行多任务
                const result = await tripleAgent.executeMultiTask(cmd, undefined, window.location.pathname);

                // 更新每个任务状态
                result.tasks.forEach((task, idx) => {
                    updateSubTaskStatus(
                        task.task_id,
                        task.success ? 'completed' : 'failed',
                        task.response
                    );
                    setCurrentTaskIndex(idx);
                });

                addCost(result.total_cost);

                if (result.success) {
                    setResult(result.summary);
                } else {
                    setError('部分任务执行失败');
                }
            } else {
                // 单任务模式
                setProcessing(false);
                setExecuting(true);

                const result = await tripleAgent.execute(cmd, undefined, window.location.pathname);
                setCurrentProvider(result.provider_used);
                addCost(result.cost_estimate);

                if (result.success) {
                    setResult(result.thinking || '任务完成');
                } else {
                    setError(result.error || '执行失败');
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '执行出错');
        }
    };

    const handleSubmit = () => {
        if (!inputValue.trim() || isProcessing || isExecuting) return;
        const cmd = inputValue.trim();
        setInputValue('');
        executeCommand(cmd);
    };

    const handleVoiceResult = (text: string) => {
        setInputValue(text);
        setTimeout(() => {
            if (text.trim()) {
                setInputValue('');
                executeCommand(text);
            }
        }, 500);
    };

    const handleConfirm = (confirmed: boolean) => {
        console.log('Confirm:', confirmed);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
        if (e.key === 'Escape') {
            close();
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                close();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            inputRef.current?.focus();
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, close]);

    if (!isOpen) {
        return null;
    }

    const exampleCommands = [
        '下架宫保鸡丁，给3桌结账',
        '查看今日营业额',
        '把A3桌收台',
        '给B2桌加一份米饭',
        '看看库存预警'
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div ref={modalRef} className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-text-primary">Synapse AI 助手</h2>
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-text-muted">三模型智能路由</p>
                                <ConnectionStatus isConnected={isConnected} connectionError={connectionError} />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <CostDisplay cost={totalCost} />
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                        >
                            <Settings2 className="w-4 h-4 text-text-secondary" />
                        </button>
                        <button onClick={close} className="p-2 rounded-lg hover:bg-white/50 transition-colors">
                            <X className="w-5 h-5 text-text-secondary" />
                        </button>
                    </div>
                </div>

                {/* Provider 状态栏 */}
                {providers.length > 0 && (
                    <div className="px-6 py-2 bg-gray-50 border-b border-border flex items-center gap-2 overflow-x-auto">
                        <span className="text-xs text-gray-500 flex-shrink-0">模型:</span>
                        {providers.map((p) => (
                            <ProviderBadge
                                key={p.name}
                                provider={p}
                                isActive={currentProvider === p.name}
                            />
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* 示例指令 */}
                    {steps.length === 0 && !command && subTasks.length === 0 && (
                        <div className="space-y-3">
                            <p className="text-sm text-text-muted">试试这些指令 (支持多任务)：</p>
                            <div className="flex flex-wrap gap-2">
                                {exampleCommands.map((example) => (
                                    <button
                                        key={example}
                                        onClick={() => setInputValue(example)}
                                        className="px-3 py-1.5 text-sm rounded-full bg-bg-secondary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
                                    >
                                        {example}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 用户指令 */}
                    {command && (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-text-muted mb-1">你的指令</p>
                                <p className="text-text-primary font-medium">{command}</p>
                            </div>
                        </div>
                    )}

                    {/* 处理中 */}
                    {(isProcessing || isExecuting) && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                            <span className="text-blue-700">
                                {isProcessing ? '正在分析指令...' : `正在执行${isMultiTask ? '多任务' : ''}操作...`}
                            </span>
                            {currentProvider && (
                                <span className="ml-auto text-xs text-blue-500">
                                    使用 {ProviderNames[currentProvider] || currentProvider}
                                </span>
                            )}
                        </div>
                    )}

                    {/* 多任务进度 */}
                    {isMultiTask && subTasks.length > 0 && (
                        <MultiTaskProgress tasks={subTasks} currentIndex={currentTaskIndex} />
                    )}

                    {/* 执行步骤 */}
                    {steps.length > 0 && (
                        <div>
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-3"
                            >
                                <ChevronDown className={`w-4 h-4 transition-transform ${showHistory ? '' : '-rotate-90'}`} />
                                执行步骤 ({steps.length})
                            </button>
                            {showHistory && <ExecutionTimeline steps={steps} />}
                        </div>
                    )}

                    {/* 确认对话 */}
                    {pendingConfirmation && (
                        <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-yellow-800 font-medium mb-3">{pendingConfirmation.message}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleConfirm(true)} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">确认执行</button>
                                        <button onClick={() => handleConfirm(false)} className="px-4 py-2 bg-white border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 transition-colors">取消</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 成功结果 */}
                    {result && (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm text-green-600 mb-1">任务完成</p>
                                <p className="text-green-800 font-medium">{result}</p>
                            </div>
                            <CostDisplay cost={totalCost} />
                        </div>
                    )}

                    {/* 错误 */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-red-600 mb-1">执行失败</p>
                                <p className="text-red-800">{error}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border bg-bg-secondary/50">
                    <div className="flex items-end gap-3">
                        <VoiceRecorder onResult={handleVoiceResult} />
                        <div className="flex-1 relative">
                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="输入指令，如给A3桌结账... (支持多任务: 下架宫保鸡丁，给3桌结账)"
                                className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                rows={1}
                                disabled={isProcessing || isExecuting}
                            />
                            <button
                                onClick={handleSubmit}
                                disabled={!inputValue.trim() || isProcessing || isExecuting}
                                className="absolute right-2 bottom-2 p-2 rounded-lg bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-text-muted">
                        <span>按 Enter 发送，Shift+Enter 换行</span>
                        <span>ESC 关闭</span>
                    </div>
                </div>

                {/* 新对话按钮 */}
                {(result || error || steps.length > 0 || subTasks.length > 0) && (
                    <div className="absolute top-4 right-20">
                        <button onClick={reset} className="px-3 py-1.5 text-xs rounded-lg bg-white border border-border hover:bg-bg-hover transition-colors">新对话</button>
                    </div>
                )}
            </div>
        </div>
    );
}
