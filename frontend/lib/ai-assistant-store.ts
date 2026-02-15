/**
 * AI 助手状态管理 (Enhanced for Triple Agent)
 */
import { create } from 'zustand';

export interface AgentAction {
    type: string;
    params: Record<string, any>;
    message?: string;
    requires_confirmation?: boolean;
}

export interface ExecutionStep {
    id: string;
    action: AgentAction;
    thinking: string;
    status: 'pending' | 'executing' | 'completed' | 'failed';
    timestamp: number;
    error?: string;
    provider?: string;  // NEW: 使用的模型
}

// NEW: 子任务
export interface SubTaskInfo {
    id: number;
    type: string;
    instruction: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    provider?: string;
    response?: string;
}

// NEW: Provider 信息
export interface ProviderInfo {
    name: string;
    type: string;
    available: boolean;
    cost_per_call: number;
    is_default: boolean;
}

export interface AIAssistantState {
    // 状态
    isOpen: boolean;
    isListening: boolean;
    isProcessing: boolean;
    isExecuting: boolean;

    // 会话
    sessionId: string | null;
    command: string;

    // 执行历史
    steps: ExecutionStep[];
    currentStep: number;

    // NEW: 多任务状态
    subTasks: SubTaskInfo[];
    currentTaskIndex: number;
    isMultiTask: boolean;

    // NEW: Provider 状态
    providers: ProviderInfo[];
    currentProvider: string | null;
    routingStrategy: string;
    totalCost: number;

    // 确认对话
    pendingConfirmation: {
        message: string;
        action: AgentAction;
    } | null;

    // 结果
    result: string | null;
    error: string | null;

    // Actions
    open: () => void;
    close: () => void;
    reset: () => void;

    setListening: (listening: boolean) => void;
    setProcessing: (processing: boolean) => void;
    setExecuting: (executing: boolean) => void;

    setCommand: (command: string) => void;
    setSessionId: (sessionId: string) => void;

    addStep: (step: ExecutionStep) => void;
    updateStepStatus: (id: string, status: ExecutionStep['status'], error?: string) => void;

    // NEW: 多任务 Actions
    setSubTasks: (tasks: SubTaskInfo[]) => void;
    updateSubTaskStatus: (id: number, status: SubTaskInfo['status'], response?: string) => void;
    setCurrentTaskIndex: (index: number) => void;
    setIsMultiTask: (isMulti: boolean) => void;

    // NEW: Provider Actions
    setProviders: (providers: ProviderInfo[]) => void;
    setCurrentProvider: (provider: string) => void;
    setRoutingStrategy: (strategy: string) => void;
    addCost: (cost: number) => void;

    setPendingConfirmation: (confirmation: AIAssistantState['pendingConfirmation']) => void;

    setResult: (result: string) => void;
    setError: (error: string) => void;
}

export const useAIAssistantStore = create<AIAssistantState>((set, get) => ({
    // 初始状态
    isOpen: false,
    isListening: false,
    isProcessing: false,
    isExecuting: false,

    sessionId: null,
    command: '',

    steps: [],
    currentStep: 0,

    // NEW: 多任务初始状态
    subTasks: [],
    currentTaskIndex: 0,
    isMultiTask: false,

    // NEW: Provider 初始状态
    providers: [],
    currentProvider: null,
    routingStrategy: 'cost_optimized',
    totalCost: 0,

    pendingConfirmation: null,

    result: null,
    error: null,

    // Actions
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),

    reset: () => set({
        isListening: false,
        isProcessing: false,
        isExecuting: false,
        sessionId: null,
        command: '',
        steps: [],
        currentStep: 0,
        subTasks: [],
        currentTaskIndex: 0,
        isMultiTask: false,
        totalCost: 0,
        pendingConfirmation: null,
        result: null,
        error: null,
    }),

    setListening: (listening) => set({ isListening: listening }),
    setProcessing: (processing) => set({ isProcessing: processing }),
    setExecuting: (executing) => set({ isExecuting: executing }),

    setCommand: (command) => set({ command }),
    setSessionId: (sessionId) => set({ sessionId }),

    addStep: (step) => set((state) => ({
        steps: [...state.steps, step],
        currentStep: state.steps.length,
    })),

    updateStepStatus: (id, status, error) => set((state) => ({
        steps: state.steps.map((s) =>
            s.id === id ? { ...s, status, error } : s
        ),
    })),

    // NEW: 多任务 Actions
    setSubTasks: (tasks) => set({ subTasks: tasks, isMultiTask: tasks.length > 1 }),
    updateSubTaskStatus: (id, status, response) => set((state) => ({
        subTasks: state.subTasks.map((t) =>
            t.id === id ? { ...t, status, response } : t
        ),
    })),
    setCurrentTaskIndex: (index) => set({ currentTaskIndex: index }),
    setIsMultiTask: (isMulti) => set({ isMultiTask: isMulti }),

    // NEW: Provider Actions
    setProviders: (providers) => set({ providers }),
    setCurrentProvider: (provider) => set({ currentProvider: provider }),
    setRoutingStrategy: (strategy) => set({ routingStrategy: strategy }),
    addCost: (cost) => set((state) => ({ totalCost: state.totalCost + cost })),

    setPendingConfirmation: (confirmation) => set({ pendingConfirmation: confirmation }),

    setResult: (result) => set({ result, isProcessing: false, isExecuting: false }),
    setError: (error) => set({ error, isProcessing: false, isExecuting: false }),
}));

