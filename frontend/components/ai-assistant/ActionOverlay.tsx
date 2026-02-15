/**
 * ActionOverlay Component
 * 
 * 显示 AI 操作执行过程的可视化覆盖层
 * 使用 CSS 动画代替 framer-motion
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, MousePointer, Type, ArrowDown } from 'lucide-react';
import type { AIAction, ActionResult, ActionStatus, ActionParams } from '@/hooks/useActionExecutor';

interface ActionOverlayProps {
    action: AIAction | null;
    status: ActionStatus;
    result: ActionResult | null;
    visible?: boolean;
}

interface ClickIndicatorProps {
    x: number;
    y: number;
}

// 点击位置指示器
function ClickIndicator({ x, y }: ClickIndicatorProps) {
    return (
        <div
            className="fixed pointer-events-none z-[10000] animate-ping"
            style={{
                left: x * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                top: y * (typeof window !== 'undefined' ? window.innerHeight : 800),
                transform: 'translate(-50%, -50%)',
            }}
        >
            <div className="w-8 h-8 rounded-full border-2 border-primary bg-primary/20" />
        </div>
    );
}

// 操作图标
function ActionIcon({ type }: { type: string }) {
    switch (type) {
        case 'click':
        case 'double_click':
        case 'right_click':
            return <MousePointer className="w-5 h-5" />;
        case 'type':
            return <Type className="w-5 h-5" />;
        case 'scroll':
            return <ArrowDown className="w-5 h-5" />;
        default:
            return <Loader2 className="w-5 h-5 animate-spin" />;
    }
}

// 状态指示器
function StatusIndicator({ status }: { status: ActionStatus }) {
    switch (status) {
        case 'executing':
            return (
                <div className="flex items-center gap-2 text-blue-500 animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>执行中...</span>
                </div>
            );
        case 'success':
            return (
                <div className="flex items-center gap-2 text-green-500 animate-in zoom-in duration-200">
                    <CheckCircle className="w-5 h-5" />
                    <span>成功</span>
                </div>
            );
        case 'failed':
            return (
                <div className="flex items-center gap-2 text-red-500 animate-in zoom-in duration-200">
                    <XCircle className="w-5 h-5" />
                    <span>失败</span>
                </div>
            );
        default:
            return null;
    }
}

export function ActionOverlay({ action, status, result, visible = true }: ActionOverlayProps) {
    const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null);
    const [showPanel, setShowPanel] = useState(false);

    // 显示点击位置
    useEffect(() => {
        if (action?.type.includes('click') && action.params.x && action.params.y) {
            setClickPos({ x: action.params.x, y: action.params.y });
            const timer = setTimeout(() => setClickPos(null), 500);
            return () => clearTimeout(timer);
        }
    }, [action]);

    // 控制面板显示
    useEffect(() => {
        if (status !== 'idle') {
            setShowPanel(true);
        } else {
            const timer = setTimeout(() => setShowPanel(false), 300);
            return () => clearTimeout(timer);
        }
    }, [status]);

    if (!visible || !action) return null;

    return (
        <>
            {/* 点击位置指示器 */}
            {clickPos && <ClickIndicator x={clickPos.x} y={clickPos.y} />}

            {/* 操作信息面板 */}
            {showPanel && status !== 'idle' && (
                <div
                    className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[9999] 
                        transition-all duration-300 ease-out
                        ${status !== 'idle' ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
                    `}
                >
                    <div className="bg-bg-primary/95 backdrop-blur-sm border border-border rounded-xl shadow-lg px-4 py-3 min-w-[240px]">
                        {/* 操作类型 */}
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <ActionIcon type={action.type} />
                            </div>
                            <div>
                                <div className="font-medium text-text-primary">
                                    {getActionLabel(action.type)}
                                </div>
                                {action.thinking && (
                                    <div className="text-xs text-text-secondary line-clamp-1">
                                        {action.thinking}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 参数信息 */}
                        {action.params && Object.keys(action.params).length > 0 && (
                            <div className="text-xs text-text-secondary mb-2 font-mono bg-bg-secondary rounded px-2 py-1">
                                {formatParams(action.params)}
                            </div>
                        )}

                        {/* 状态 */}
                        <div className="flex items-center justify-between">
                            <StatusIndicator status={status} />
                            {result?.duration && result.duration > 0 && (
                                <span className="text-xs text-text-tertiary">
                                    {result.duration}ms
                                </span>
                            )}
                        </div>

                        {/* 错误信息 */}
                        {result?.error && (
                            <div className="mt-2 text-xs text-red-500 bg-red-50 rounded px-2 py-1">
                                {result.error}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 执行中遮罩 */}
            {status === 'executing' && (
                <div
                    className="fixed inset-0 bg-black/5 z-[9998] pointer-events-none transition-opacity duration-300"
                />
            )}
        </>
    );
}

// 获取操作标签
function getActionLabel(type: string): string {
    const labels: Record<string, string> = {
        click: '点击',
        double_click: '双击',
        right_click: '右键点击',
        type: '输入文本',
        clear: '清空',
        scroll: '滚动',
        navigate: '导航',
        back: '返回',
        refresh: '刷新',
        wait: '等待',
        wait_for: '等待元素',
        hover: '悬停',
        drag: '拖拽',
        select: '选择',
        screenshot: '截图',
        finish: '完成',
    };
    return labels[type] || type;
}

// 格式化参数
function formatParams(params: ActionParams): string {
    const parts: string[] = [];

    if (params.selector) {
        parts.push(`选择器: ${params.selector}`);
    }
    if (params.text) {
        const text = String(params.text);
        parts.push(`文本: ${text.slice(0, 20)}${text.length > 20 ? '...' : ''}`);
    }
    if (params.x !== undefined && params.y !== undefined) {
        parts.push(`位置: (${(Number(params.x) * 100).toFixed(0)}%, ${(Number(params.y) * 100).toFixed(0)}%)`);
    }
    if (params.direction) {
        parts.push(`方向: ${params.direction}`);
    }
    if (params.path) {
        parts.push(`路径: ${params.path}`);
    }

    return parts.join(' | ') || '无参数';
}

export default ActionOverlay;
