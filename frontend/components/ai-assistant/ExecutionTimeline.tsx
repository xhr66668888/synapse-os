'use client';

import {
    CheckCircle2,
    Circle,
    Loader2,
    XCircle,
    Navigation,
    MousePointer,
    Type,
    ArrowUpDown,
    List,
    Clock,
    AlertCircle,
    Zap,
    MessageSquare
} from 'lucide-react';
import { ExecutionStep } from '@/lib/ai-assistant-store';

interface ExecutionTimelineProps {
    steps: ExecutionStep[];
}

const actionIcons: Record<string, React.ReactNode> = {
    Navigate: <Navigation className="w-4 h-4" />,
    Click: <MousePointer className="w-4 h-4" />,
    Type: <Type className="w-4 h-4" />,
    Scroll: <ArrowUpDown className="w-4 h-4" />,
    Select: <List className="w-4 h-4" />,
    Wait: <Clock className="w-4 h-4" />,
    Confirm: <AlertCircle className="w-4 h-4" />,
    APICall: <Zap className="w-4 h-4" />,
    finish: <MessageSquare className="w-4 h-4" />,
};

const statusIcons: Record<ExecutionStep['status'], React.ReactNode> = {
    pending: <Circle className="w-4 h-4 text-gray-400" />,
    executing: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
    completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    failed: <XCircle className="w-4 h-4 text-red-500" />,
};

const statusColors: Record<ExecutionStep['status'], string> = {
    pending: 'border-gray-200 bg-gray-50',
    executing: 'border-blue-200 bg-blue-50',
    completed: 'border-green-200 bg-green-50',
    failed: 'border-red-200 bg-red-50',
};

function formatActionDescription(action: ExecutionStep['action']): string {
    switch (action.type) {
        case 'Navigate':
            return `导航到 ${action.params.path}`;
        case 'Click':
            if (action.params.selector) {
                return `点击 ${action.params.selector}`;
            }
            if (action.params.element) {
                return `点击坐标 (${action.params.element.join(', ')})`;
            }
            return '点击元素';
        case 'Type':
            return `输入 "${action.params.text?.slice(0, 20)}${action.params.text?.length > 20 ? '...' : ''}"`;
        case 'Scroll':
            return `${action.params.direction === 'down' ? '向下' : '向上'}滚动`;
        case 'Select':
            return `选择 ${action.params.value}`;
        case 'Wait':
            return `等待 ${action.params.duration} 秒`;
        case 'Confirm':
            return `确认: ${action.message}`;
        case 'APICall':
            return `调用 API: ${action.params.endpoint}`;
        case 'finish':
            return action.message || '任务完成';
        default:
            return action.type;
    }
}

export function ExecutionTimeline({ steps }: ExecutionTimelineProps) {
    return (
        <div className="space-y-2">
            {steps.map((step, index) => (
                <div
                    key={step.id}
                    className={`relative flex items-start gap-3 p-3 rounded-xl border ${statusColors[step.status]} transition-all`}
                >
                    {/* 连接线 */}
                    {index < steps.length - 1 && (
                        <div className="absolute left-[26px] top-12 w-0.5 h-[calc(100%-24px)] bg-gray-200" />
                    )}

                    {/* 状态图标 */}
                    <div className="flex-shrink-0 mt-0.5">
                        {statusIcons[step.status]}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                        {/* 操作描述 */}
                        <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-white/50">
                                {actionIcons[step.action.type] || <Circle className="w-4 h-4" />}
                            </span>
                            <span className="text-sm font-medium text-text-primary truncate">
                                {formatActionDescription(step.action)}
                            </span>
                        </div>

                        {/* 思考过程 */}
                        {step.thinking && (
                            <p className="mt-1 text-xs text-text-muted line-clamp-2">
                                {step.thinking}
                            </p>
                        )}

                        {/* 错误信息 */}
                        {step.error && (
                            <p className="mt-1 text-xs text-red-600">
                                {step.error}
                            </p>
                        )}

                        {/* 时间戳 */}
                        <p className="mt-1 text-[10px] text-text-muted">
                            {new Date(step.timestamp).toLocaleTimeString()}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
