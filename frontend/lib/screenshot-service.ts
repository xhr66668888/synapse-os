/**
 * Screenshot Service
 * 
 * 使用 html2canvas 截取页面截图并发送给后端
 */

import html2canvas from 'html2canvas';

export interface ScreenshotOptions {
    scale?: number;
    quality?: number;
    format?: 'webp' | 'png' | 'jpeg';
    element?: HTMLElement;
    excludeSelectors?: string[];
}

export interface ScreenshotResult {
    dataUrl: string;
    base64: string;
    width: number;
    height: number;
    timestamp: string;
}

const DEFAULT_OPTIONS: ScreenshotOptions = {
    scale: 0.5,
    quality: 0.8,
    format: 'webp',
};

/**
 * 截取当前页面
 */
export async function captureScreenshot(
    options: ScreenshotOptions = {}
): Promise<ScreenshotResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const element = opts.element || document.body;

    // 配置 html2canvas
    const canvas = await html2canvas(element, {
        scale: opts.scale,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        ignoreElements: (el) => {
            // 排除某些元素
            if (opts.excludeSelectors) {
                for (const selector of opts.excludeSelectors) {
                    if (el.matches?.(selector)) {
                        return true;
                    }
                }
            }
            // 排除 AI 助手本身
            if (el.closest?.('[data-ai-assistant]')) {
                return true;
            }
            return false;
        },
    });

    // 转换格式
    const mimeType = opts.format === 'png'
        ? 'image/png'
        : opts.format === 'jpeg'
            ? 'image/jpeg'
            : 'image/webp';

    const dataUrl = canvas.toDataURL(mimeType, opts.quality);
    const base64 = dataUrl.split(',')[1];

    return {
        dataUrl,
        base64,
        width: canvas.width,
        height: canvas.height,
        timestamp: new Date().toISOString(),
    };
}

/**
 * 将截图发送到后端
 */
export async function sendScreenshotToBackend(
    screenshot: ScreenshotResult,
    sessionId?: string,
    pagePath?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    try {
        const formData = new FormData();
        formData.append('screenshot', screenshot.dataUrl);
        if (sessionId) formData.append('session_id', sessionId);
        if (pagePath) formData.append('page_path', pagePath);

        const response = await fetch(`${apiUrl}/api/v1/agent/screenshot`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        return { success: true, id: result.id };
    } catch (error) {
        console.error('Failed to send screenshot:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * 截取并发送截图 (一体化)
 */
export async function captureAndSend(
    sessionId?: string,
    options?: ScreenshotOptions
): Promise<{ screenshot: ScreenshotResult; sent: boolean }> {
    const screenshot = await captureScreenshot(options);
    const pagePath = typeof window !== 'undefined' ? window.location.pathname : undefined;

    const result = await sendScreenshotToBackend(screenshot, sessionId, pagePath);

    return {
        screenshot,
        sent: result.success,
    };
}

/**
 * 截图服务类
 */
class ScreenshotServiceClass {
    private lastScreenshot: ScreenshotResult | null = null;
    private isCapturing = false;

    async capture(options?: ScreenshotOptions): Promise<ScreenshotResult> {
        if (this.isCapturing) {
            // 防止并发截图
            if (this.lastScreenshot) {
                return this.lastScreenshot;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.isCapturing = true;
        try {
            this.lastScreenshot = await captureScreenshot(options);
            return this.lastScreenshot;
        } finally {
            this.isCapturing = false;
        }
    }

    getLastScreenshot(): ScreenshotResult | null {
        return this.lastScreenshot;
    }

    async captureAndSend(sessionId?: string, options?: ScreenshotOptions) {
        return captureAndSend(sessionId, options);
    }
}

export const screenshotService = new ScreenshotServiceClass();
