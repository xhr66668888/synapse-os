/**
 * Agent 执行器 - 在前端执行 AI Agent 的操作指令
 */

import { AgentAction } from './ai-assistant-store';

export interface ExecutionResult {
    success: boolean;
    error?: string;
    screenshot?: string;
}

/**
 * 截图功能 - 使用 html2canvas 或原生方法
 */
export async function captureScreen(): Promise<string> {
    try {
        // 尝试使用 html2canvas（如果可用）
        if (typeof window !== 'undefined') {
            const html2canvas = await import('html2canvas').then(m => m.default).catch(() => null);
            
            if (html2canvas) {
                const canvas = await html2canvas(document.body, {
                    scale: 0.5, // 降低分辨率以减小数据量
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                });
                return canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
            }
        }
        
        // 回退：返回空字符串
        return '';
    } catch (error) {
        console.error('Screen capture failed:', error);
        return '';
    }
}

/**
 * 获取当前页面路径
 */
export function getCurrentPage(): string {
    if (typeof window !== 'undefined') {
        return window.location.pathname;
    }
    return '/';
}

/**
 * 等待指定时间
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Agent 执行器类
 */
export class AgentExecutor {
    private router: { push: (path: string) => void } | null = null;

    constructor(router?: { push: (path: string) => void }) {
        this.router = router || null;
    }

    /**
     * 设置路由器
     */
    setRouter(router: { push: (path: string) => void }) {
        this.router = router;
    }

    /**
     * 执行操作
     */
    async execute(action: AgentAction): Promise<ExecutionResult> {
        try {
            switch (action.type) {
                case 'Navigate':
                    return await this.executeNavigate(action);
                case 'Click':
                    return await this.executeClick(action);
                case 'Type':
                    return await this.executeType(action);
                case 'Scroll':
                    return await this.executeScroll(action);
                case 'Select':
                    return await this.executeSelect(action);
                case 'Wait':
                    return await this.executeWait(action);
                case 'APICall':
                    return await this.executeAPICall(action);
                case 'finish':
                    return { success: true };
                default:
                    return { success: false, error: `Unknown action type: ${action.type}` };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * 导航操作
     */
    private async executeNavigate(action: AgentAction): Promise<ExecutionResult> {
        const path = action.params.path;
        if (!path) {
            return { success: false, error: 'No path specified' };
        }

        if (this.router) {
            await this.router.push(path);
        } else if (typeof window !== 'undefined') {
            window.location.href = path;
        }

        // 等待页面加载
        await sleep(500);
        
        return { success: true };
    }

    /**
     * 点击操作
     */
    private async executeClick(action: AgentAction): Promise<ExecutionResult> {
        const { selector, element } = action.params;

        let targetElement: Element | null = null;

        // 通过选择器查找
        if (selector) {
            targetElement = document.querySelector(selector);
        }
        
        // 通过坐标查找
        if (!targetElement && element && Array.isArray(element)) {
            const [x, y] = element;
            // 将相对坐标 (0-1000) 转换为绝对坐标
            const absX = (x / 1000) * window.innerWidth;
            const absY = (y / 1000) * window.innerHeight;
            targetElement = document.elementFromPoint(absX, absY);
        }

        if (!targetElement) {
            return { success: false, error: 'Element not found' };
        }

        // 模拟点击
        if (targetElement instanceof HTMLElement) {
            targetElement.click();
            targetElement.focus();
        } else {
            targetElement.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            }));
        }

        // 等待响应
        await sleep(300);

        return { success: true };
    }

    /**
     * 输入操作
     */
    private async executeType(action: AgentAction): Promise<ExecutionResult> {
        const { selector, text } = action.params;

        if (!selector || text === undefined) {
            return { success: false, error: 'Selector or text not specified' };
        }

        const element = document.querySelector(selector);
        if (!element) {
            return { success: false, error: 'Input element not found' };
        }

        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            // 聚焦
            element.focus();
            
            // 清空并输入
            element.value = text;
            
            // 触发事件
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (element.getAttribute('contenteditable') === 'true') {
            // 可编辑元素
            element.textContent = text;
            element.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            return { success: false, error: 'Element is not an input' };
        }

        await sleep(200);

        return { success: true };
    }

    /**
     * 滚动操作
     */
    private async executeScroll(action: AgentAction): Promise<ExecutionResult> {
        const { direction, amount, selector } = action.params;
        const scrollAmount = amount || 300;

        let target: Element | Window = window;
        if (selector) {
            const element = document.querySelector(selector);
            if (element) target = element;
        }

        const scrollOptions: ScrollToOptions = {
            behavior: 'smooth'
        };

        if (direction === 'up') {
            scrollOptions.top = -scrollAmount;
        } else if (direction === 'down') {
            scrollOptions.top = scrollAmount;
        } else if (direction === 'left') {
            scrollOptions.left = -scrollAmount;
        } else if (direction === 'right') {
            scrollOptions.left = scrollAmount;
        }

        if (target === window) {
            window.scrollBy(scrollOptions);
        } else {
            (target as Element).scrollBy(scrollOptions);
        }

        await sleep(400);

        return { success: true };
    }

    /**
     * 选择操作
     */
    private async executeSelect(action: AgentAction): Promise<ExecutionResult> {
        const { selector, value } = action.params;

        if (!selector || value === undefined) {
            return { success: false, error: 'Selector or value not specified' };
        }

        const element = document.querySelector(selector);
        if (!element) {
            return { success: false, error: 'Select element not found' };
        }

        if (element instanceof HTMLSelectElement) {
            element.value = value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            return { success: false, error: 'Element is not a select' };
        }

        await sleep(200);

        return { success: true };
    }

    /**
     * 等待操作
     */
    private async executeWait(action: AgentAction): Promise<ExecutionResult> {
        const duration = action.params.duration || 1;
        await sleep(duration * 1000);
        return { success: true };
    }

    /**
     * API 调用操作
     */
    private async executeAPICall(action: AgentAction): Promise<ExecutionResult> {
        const { endpoint, method = 'GET', data } = action.params;

        if (!endpoint) {
            return { success: false, error: 'No endpoint specified' };
        }

        try {
            const options: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            if (data && method !== 'GET') {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(endpoint, options);
            
            if (!response.ok) {
                return { success: false, error: `API call failed: ${response.status}` };
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'API call failed'
            };
        }
    }

    /**
     * 执行操作并截图
     */
    async executeWithScreenshot(action: AgentAction): Promise<ExecutionResult> {
        const result = await this.execute(action);
        
        if (result.success) {
            // 等待 UI 更新后截图
            await sleep(500);
            result.screenshot = await captureScreen();
        }

        return result;
    }
}

// 全局执行器实例
let _executor: AgentExecutor | null = null;

export function getAgentExecutor(): AgentExecutor {
    if (!_executor) {
        _executor = new AgentExecutor();
    }
    return _executor;
}
