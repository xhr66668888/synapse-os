/**
 * useActionExecutor Hook
 * 
 * 负责执行后端发送的 AI 操作指令
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import { screenshotService } from '@/lib/screenshot-service';

// ============== 类型定义 ==============

export interface AIAction {
    id: string;
    type: ActionType;
    params: ActionParams;
    thinking?: string;
    timeout?: number;
}

export type ActionType =
    | 'click'
    | 'double_click'
    | 'right_click'
    | 'type'
    | 'clear'
    | 'scroll'
    | 'navigate'
    | 'back'
    | 'refresh'
    | 'wait'
    | 'wait_for'
    | 'hover'
    | 'drag'
    | 'select'
    | 'screenshot'
    | 'finish';

export interface ActionParams {
    selector?: string;
    text?: string;
    x?: number;
    y?: number;
    direction?: 'up' | 'down' | 'left' | 'right';
    amount?: number;
    path?: string;
    seconds?: number;
    timeout?: number;
    message?: string;
    success?: boolean;
    start_x?: number;
    start_y?: number;
    end_x?: number;
    end_y?: number;
}

export interface ActionResult {
    actionId: string;
    success: boolean;
    message: string;
    error?: string;
    screenshot?: string;
    duration: number;
    elementInfo?: {
        tagName: string;
        className: string;
        id: string;
        text: string;
    };
}

export type ActionStatus = 'idle' | 'executing' | 'success' | 'failed';

// ============== 辅助函数 ==============

/**
 * 根据选择器找元素
 */
function findElement(selector: string): HTMLElement | null {
    // 尝试 CSS 选择器
    try {
        const el = document.querySelector(selector);
        if (el) return el as HTMLElement;
    } catch {
        // 选择器无效
    }

    // 尝试按文本查找
    if (selector.includes(':contains(')) {
        const match = selector.match(/:contains\(["']?(.+?)["']?\)/);
        if (match) {
            const text = match[1];
            const elements = document.querySelectorAll('button, a, span, div, p, h1, h2, h3, h4, h5, h6');
            for (const el of elements) {
                if (el.textContent?.includes(text)) {
                    return el as HTMLElement;
                }
            }
        }
    }

    return null;
}

/**
 * 根据坐标找元素
 */
function findElementByCoords(x: number, y: number): HTMLElement | null {
    // x, y 是 0-1 的相对坐标
    const absX = x * window.innerWidth;
    const absY = y * window.innerHeight;

    const el = document.elementFromPoint(absX, absY);
    return el as HTMLElement | null;
}

/**
 * 获取元素信息
 */
function getElementInfo(el: HTMLElement | null) {
    if (!el) return undefined;
    return {
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        text: el.textContent?.slice(0, 100) || '',
    };
}

/**
 * 模拟点击
 */
function simulateClick(el: HTMLElement, button: 'left' | 'right' = 'left') {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const eventInit = {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: button === 'right' ? 2 : 0,
    };

    el.dispatchEvent(new MouseEvent('mousedown', eventInit));
    el.dispatchEvent(new MouseEvent('mouseup', eventInit));
    el.dispatchEvent(new MouseEvent('click', eventInit));
}

/**
 * 模拟输入
 */
function simulateType(el: HTMLElement, text: string) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.focus();
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (el.isContentEditable) {
        el.focus();
        el.textContent = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

/**
 * 模拟滚动
 */
function simulateScroll(
    direction: 'up' | 'down' | 'left' | 'right',
    amount: number = 300,
    el?: HTMLElement
) {
    const target = el || document.documentElement;

    const scrollOptions: ScrollToOptions = {
        behavior: 'smooth',
    };

    switch (direction) {
        case 'up':
            target.scrollBy({ top: -amount, ...scrollOptions });
            break;
        case 'down':
            target.scrollBy({ top: amount, ...scrollOptions });
            break;
        case 'left':
            target.scrollBy({ left: -amount, ...scrollOptions });
            break;
        case 'right':
            target.scrollBy({ left: amount, ...scrollOptions });
            break;
    }
}

// ============== Hook ==============

export function useActionExecutor() {
    const [status, setStatus] = useState<ActionStatus>('idle');
    const [currentAction, setCurrentAction] = useState<AIAction | null>(null);
    const [lastResult, setLastResult] = useState<ActionResult | null>(null);
    const executingRef = useRef(false);

    /**
     * 执行单个 Action
     */
    const execute = useCallback(async (action: AIAction): Promise<ActionResult> => {
        if (executingRef.current) {
            return {
                actionId: action.id,
                success: false,
                message: 'Already executing another action',
                error: 'BUSY',
                duration: 0,
            };
        }

        executingRef.current = true;
        setStatus('executing');
        setCurrentAction(action);

        const startTime = Date.now();
        let result: ActionResult;

        try {
            switch (action.type) {
                case 'click':
                case 'double_click':
                case 'right_click':
                    result = await executeClick(action);
                    break;
                case 'type':
                    result = await executeType(action);
                    break;
                case 'scroll':
                    result = await executeScroll(action);
                    break;
                case 'navigate':
                    result = await executeNavigate(action);
                    break;
                case 'wait':
                    result = await executeWait(action);
                    break;
                case 'wait_for':
                    result = await executeWaitFor(action);
                    break;
                case 'screenshot':
                    result = await executeScreenshot(action);
                    break;
                case 'finish':
                    result = await executeFinish(action);
                    break;
                case 'back':
                    window.history.back();
                    result = { actionId: action.id, success: true, message: 'Navigated back', duration: 0 };
                    break;
                case 'refresh':
                    window.location.reload();
                    result = { actionId: action.id, success: true, message: 'Refreshed', duration: 0 };
                    break;
                default:
                    result = {
                        actionId: action.id,
                        success: false,
                        message: `Unknown action type: ${action.type}`,
                        error: 'UNKNOWN_ACTION',
                        duration: 0,
                    };
            }
        } catch (error) {
            result = {
                actionId: action.id,
                success: false,
                message: 'Action execution failed',
                error: String(error),
                duration: Date.now() - startTime,
            };
        }

        result.duration = Date.now() - startTime;

        setStatus(result.success ? 'success' : 'failed');
        setLastResult(result);
        setCurrentAction(null);
        executingRef.current = false;

        return result;
    }, []);

    /**
     * 执行点击
     */
    async function executeClick(action: AIAction): Promise<ActionResult> {
        const { params } = action;
        let el: HTMLElement | null = null;

        // 优先使用选择器
        if (params.selector) {
            el = findElement(params.selector);
        } else if (params.text) {
            el = findElement(`:contains("${params.text}")`);
        } else if (params.x !== undefined && params.y !== undefined) {
            el = findElementByCoords(params.x, params.y);
        }

        if (!el) {
            return {
                actionId: action.id,
                success: false,
                message: 'Element not found',
                error: 'ELEMENT_NOT_FOUND',
                duration: 0,
            };
        }

        // 滚动到可见
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 200));

        // 执行点击
        const button = action.type === 'right_click' ? 'right' : 'left';
        const count = action.type === 'double_click' ? 2 : 1;

        for (let i = 0; i < count; i++) {
            simulateClick(el, button);
            if (i < count - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return {
            actionId: action.id,
            success: true,
            message: `Clicked ${el.tagName}`,
            elementInfo: getElementInfo(el),
            duration: 0,
        };
    }

    /**
     * 执行输入
     */
    async function executeType(action: AIAction): Promise<ActionResult> {
        const { params } = action;
        let el: HTMLElement | null = null;

        if (params.selector) {
            el = findElement(params.selector);
        } else {
            // 使用当前焦点元素
            el = document.activeElement as HTMLElement;
        }

        if (!el) {
            return {
                actionId: action.id,
                success: false,
                message: 'Input element not found',
                error: 'ELEMENT_NOT_FOUND',
                duration: 0,
            };
        }

        simulateType(el, params.text || '');

        return {
            actionId: action.id,
            success: true,
            message: `Typed: ${params.text?.slice(0, 20)}...`,
            elementInfo: getElementInfo(el),
            duration: 0,
        };
    }

    /**
     * 执行滚动
     */
    async function executeScroll(action: AIAction): Promise<ActionResult> {
        const { params } = action;
        let el: HTMLElement | undefined;

        if (params.selector) {
            el = findElement(params.selector) || undefined;
        }

        simulateScroll(
            params.direction || 'down',
            params.amount || 300,
            el
        );

        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            actionId: action.id,
            success: true,
            message: `Scrolled ${params.direction || 'down'}`,
            duration: 0,
        };
    }

    /**
     * 执行导航
     */
    async function executeNavigate(action: AIAction): Promise<ActionResult> {
        const { params } = action;

        if (!params.path) {
            return {
                actionId: action.id,
                success: false,
                message: 'No path specified',
                error: 'MISSING_PATH',
                duration: 0,
            };
        }

        // 使用 Next.js router 或直接跳转
        if (typeof window !== 'undefined') {
            window.location.href = params.path;
        }

        return {
            actionId: action.id,
            success: true,
            message: `Navigating to ${params.path}`,
            duration: 0,
        };
    }

    /**
     * 执行等待
     */
    async function executeWait(action: AIAction): Promise<ActionResult> {
        const seconds = action.params.seconds || 1;
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));

        return {
            actionId: action.id,
            success: true,
            message: `Waited ${seconds}s`,
            duration: seconds * 1000,
        };
    }

    /**
     * 等待元素出现
     */
    async function executeWaitFor(action: AIAction): Promise<ActionResult> {
        const { params } = action;
        const timeout = params.timeout || 5000;
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            if (params.selector && findElement(params.selector)) {
                return {
                    actionId: action.id,
                    success: true,
                    message: `Element found: ${params.selector}`,
                    duration: Date.now() - startTime,
                };
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return {
            actionId: action.id,
            success: false,
            message: 'Element not found within timeout',
            error: 'TIMEOUT',
            duration: timeout,
        };
    }

    /**
     * 执行截图
     */
    async function executeScreenshot(action: AIAction): Promise<ActionResult> {
        try {
            const screenshot = await screenshotService.capture();
            return {
                actionId: action.id,
                success: true,
                message: 'Screenshot captured',
                screenshot: screenshot.base64,
                duration: 0,
            };
        } catch (error) {
            return {
                actionId: action.id,
                success: false,
                message: 'Screenshot failed',
                error: String(error),
                duration: 0,
            };
        }
    }

    /**
     * 执行完成
     */
    async function executeFinish(action: AIAction): Promise<ActionResult> {
        return {
            actionId: action.id,
            success: action.params.success !== false,
            message: action.params.message || '任务完成',
            duration: 0,
        };
    }

    /**
     * 批量执行 Actions
     */
    const executeSequence = useCallback(async (
        actions: AIAction[],
        onProgress?: (index: number, result: ActionResult) => void
    ): Promise<ActionResult[]> => {
        const results: ActionResult[] = [];

        for (let i = 0; i < actions.length; i++) {
            const result = await execute(actions[i]);
            results.push(result);

            onProgress?.(i, result);

            // 如果失败，停止执行
            if (!result.success) {
                break;
            }

            // 步骤间等待
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        return results;
    }, [execute]);

    /**
     * 取消当前执行
     */
    const cancel = useCallback(() => {
        executingRef.current = false;
        setStatus('idle');
        setCurrentAction(null);
    }, []);

    return {
        status,
        currentAction,
        lastResult,
        execute,
        executeSequence,
        cancel,
        isExecuting: status === 'executing',
    };
}
