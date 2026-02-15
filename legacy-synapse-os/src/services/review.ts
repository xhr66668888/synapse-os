// 自动好评系统服务
// 预留接口 - 待对接实际平台 API

export type ReviewPlatform = 'google' | 'yelp' | 'doordash' | 'ubereats';

// 好评请求配置
export interface ReviewRequestConfig {
    enabled: boolean;
    triggerCondition: 'after_payment' | 'after_delivery' | 'manual';
    delayMinutes: number;  // 发送延迟（分钟）
    minimumRating: number; // 最低评分阈值，低于此值不请求好评
    platforms: ReviewPlatform[];
    incentiveEnabled: boolean; // 是否提供激励（折扣券等）
    incentiveAmount?: number;  // 激励金额
}

// 好评请求记录
export interface ReviewRequest {
    id: string;
    orderId: string;
    customerEmail?: string;
    customerPhone?: string;
    status: 'pending' | 'sent' | 'completed' | 'declined';
    platform: ReviewPlatform;
    rating?: number;
    sentAt?: Date;
    completedAt?: Date;
}

// 默认配置
const defaultConfig: ReviewRequestConfig = {
    enabled: true,
    triggerCondition: 'after_payment',
    delayMinutes: 30,
    minimumRating: 4,
    platforms: ['google'],
    incentiveEnabled: false,
};

/**
 * 自动好评系统服务类
 */
class ReviewService {
    private config: ReviewRequestConfig = defaultConfig;
    private pendingRequests: ReviewRequest[] = [];

    /**
     * 更新配置
     */
    setConfig(config: Partial<ReviewRequestConfig>): void {
        this.config = { ...this.config, ...config };
        console.log('⭐ [Review] Config updated:', this.config);
    }

    getConfig(): ReviewRequestConfig {
        return this.config;
    }

    /**
     * 触发好评请求
     * 预留接口 - 实际应发送短信/邮件
     */
    async triggerReviewRequest(
        orderId: string,
        customerContact: { email?: string; phone?: string },
        platform: ReviewPlatform = 'google'
    ): Promise<ReviewRequest> {
        const request: ReviewRequest = {
            id: `REV_${Date.now()}`,
            orderId,
            customerEmail: customerContact.email,
            customerPhone: customerContact.phone,
            status: 'pending',
            platform,
        };

        this.pendingRequests.push(request);

        // 延迟发送
        if (this.config.delayMinutes > 0) {
            console.log(`⭐ [Review] Scheduled for ${this.config.delayMinutes} minutes later`);
            setTimeout(() => {
                this.sendReviewRequest(request.id);
            }, this.config.delayMinutes * 60 * 1000);
        } else {
            await this.sendReviewRequest(request.id);
        }

        return request;
    }

    /**
     * 发送好评请求
     * 预留接口 - 待对接 SMS/Email 服务
     */
    private async sendReviewRequest(requestId: string): Promise<void> {
        const request = this.pendingRequests.find(r => r.id === requestId);
        if (!request) return;

        // TODO: 实际发送逻辑
        // 1. 生成好评链接（带追踪参数）
        // 2. 发送短信或邮件
        // 3. 记录发送状态

        console.log(`⭐ [Review] Sending request:`, {
            id: request.id,
            platform: request.platform,
            to: request.customerEmail || request.customerPhone,
        });

        request.status = 'sent';
        request.sentAt = new Date();
    }

    /**
     * 生成好评链接
     */
    generateReviewLink(platform: ReviewPlatform, orderId: string): string {
        // 预留 - 实际链接取决于平台
        const baseUrls: Record<ReviewPlatform, string> = {
            google: 'https://g.page/r/YOUR_PLACE_ID/review',
            yelp: 'https://www.yelp.com/writeareview/biz/YOUR_BIZ_ID',
            doordash: 'https://www.doordash.com/orders/ORDER_ID/rate',
            ubereats: 'https://www.ubereats.com/orders/ORDER_ID/rate',
        };

        return `${baseUrls[platform]}?ref=${orderId}`;
    }

    /**
     * 获取好评统计
     */
    getStats(): { sent: number; completed: number; avgRating: number } {
        const sent = this.pendingRequests.filter(r => r.status === 'sent' || r.status === 'completed').length;
        const completed = this.pendingRequests.filter(r => r.status === 'completed');
        const avgRating = completed.length > 0
            ? completed.reduce((sum, r) => sum + (r.rating || 0), 0) / completed.length
            : 0;

        return { sent, completed: completed.length, avgRating };
    }
}

export const reviewService = new ReviewService();
export default reviewService;
