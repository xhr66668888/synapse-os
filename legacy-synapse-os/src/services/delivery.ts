// 外卖平台服务
// 预留接口 - 待对接 DoorDash/UberEats/Grubhub API

export type DeliveryPlatform = 'doordash' | 'ubereats' | 'grubhub';

// 外卖订单
export interface DeliveryOrder {
    id: string;
    platform: DeliveryPlatform;
    externalOrderId: string;
    customerName: string;
    customerPhone?: string;
    deliveryAddress: string;
    items: {
        name: string;
        quantity: number;
        price: number;
        notes?: string;
    }[];
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    tip: number;
    total: number;
    status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
    estimatedPickupTime?: string;
    driverName?: string;
    driverPhone?: string;
    createdAt: Date;
}

// 平台连接状态
export interface PlatformConnection {
    platform: DeliveryPlatform;
    isConnected: boolean;
    isActive: boolean;  // 是否接单中
    lastSyncAt?: Date;
    merchantId?: string;
    storeId?: string;
}

// 库存熔断配置
export interface CircuitBreakerConfig {
    enabled: boolean;
    minInventoryThreshold: number;  // 最低库存阈值
    autoPauseDelivery: boolean;     // 是否自动暂停外卖
    notifyOnPause: boolean;         // 暂停时是否通知
}

/**
 * 外卖平台服务类
 * 预留接口 - 实际API对接待完成
 */
class DeliveryService {
    private connections: Map<DeliveryPlatform, PlatformConnection> = new Map();
    private circuitBreaker: CircuitBreakerConfig = {
        enabled: true,
        minInventoryThreshold: 5,
        autoPauseDelivery: true,
        notifyOnPause: true,
    };

    constructor() {
        // 初始化平台连接状态
        const platforms: DeliveryPlatform[] = ['doordash', 'ubereats', 'grubhub'];
        platforms.forEach(platform => {
            this.connections.set(platform, {
                platform,
                isConnected: false,
                isActive: false,
            });
        });
    }

    /**
     * 连接外卖平台
     * 预留接口 - 待对接实际 OAuth 流程
     */
    async connectPlatform(platform: DeliveryPlatform, credentials: {
        merchantId: string;
        apiKey: string;
        storeId?: string;
    }): Promise<{ success: boolean; error?: string }> {
        console.log(`🔗 [Delivery] Connecting to ${platform}...`, credentials);

        // TODO: 实际 OAuth 认证流程
        // DoorDash: https://developer.doordash.com/
        // UberEats: https://developer.uber.com/docs/eats
        // Grubhub: (需要商务合作)

        // 模拟连接成功
        this.connections.set(platform, {
            platform,
            isConnected: true,
            isActive: false,
            merchantId: credentials.merchantId,
            storeId: credentials.storeId,
            lastSyncAt: new Date(),
        });

        return { success: true };
    }

    /**
     * 断开平台连接
     */
    async disconnectPlatform(platform: DeliveryPlatform): Promise<void> {
        const conn = this.connections.get(platform);
        if (conn) {
            conn.isConnected = false;
            conn.isActive = false;
        }
    }

    /**
     * 开始/暂停接单
     */
    async toggleActive(platform: DeliveryPlatform, active: boolean): Promise<{ success: boolean }> {
        console.log(`🔔 [Delivery] ${platform} ${active ? 'ACTIVE' : 'PAUSED'}`);

        const conn = this.connections.get(platform);
        if (conn) {
            conn.isActive = active;
        }

        // TODO: 调用平台 API 更新店铺状态
        // DoorDash: PATCH /v1/stores/{store_id}/status
        // UberEats: PUT /eats/stores/{store_id}/status

        return { success: true };
    }

    /**
     * 同步订单
     * 预留接口 - 应使用 Webhook 接收实时订单
     */
    async syncOrders(platform: DeliveryPlatform): Promise<DeliveryOrder[]> {
        console.log(`🔄 [Delivery] Syncing orders from ${platform}...`);

        // TODO: 实际调用平台 API 获取订单
        // 推荐使用 Webhook 模式而非轮询

        // 返回模拟数据
        return [];
    }

    /**
     * 确认订单
     */
    async confirmOrder(platform: DeliveryPlatform, orderId: string, prepTime: number): Promise<{ success: boolean }> {
        console.log(`✅ [Delivery] Confirming order ${orderId} on ${platform}, prep time: ${prepTime} mins`);

        // TODO: 调用平台 API 确认订单
        // DoorDash: PATCH /v1/orders/{order_id}
        // UberEats: POST /eats/orders/{order_id}/accept

        return { success: true };
    }

    /**
     * 标记订单就绪
     */
    async markReady(platform: DeliveryPlatform, orderId: string): Promise<{ success: boolean }> {
        console.log(`📦 [Delivery] Order ${orderId} ready for pickup on ${platform}`);

        // TODO: 调用平台 API 标记就绪

        return { success: true };
    }

    /**
     * 取消订单
     */
    async cancelOrder(platform: DeliveryPlatform, orderId: string, reason: string): Promise<{ success: boolean }> {
        console.log(`❌ [Delivery] Cancelling order ${orderId} on ${platform}: ${reason}`);

        // TODO: 调用平台 API 取消订单

        return { success: true };
    }

    /**
     * 库存熔断检查
     * 当库存不足时自动暂停外卖接单
     */
    async checkCircuitBreaker(inventoryLevel: number): Promise<{
        shouldPause: boolean;
        pausedPlatforms: DeliveryPlatform[];
    }> {
        if (!this.circuitBreaker.enabled) {
            return { shouldPause: false, pausedPlatforms: [] };
        }

        if (inventoryLevel < this.circuitBreaker.minInventoryThreshold) {
            console.log(`⚠️ [Circuit Breaker] Low inventory (${inventoryLevel}), pausing delivery...`);

            const pausedPlatforms: DeliveryPlatform[] = [];

            if (this.circuitBreaker.autoPauseDelivery) {
                for (const [platform, conn] of this.connections) {
                    if (conn.isActive) {
                        await this.toggleActive(platform, false);
                        pausedPlatforms.push(platform);
                    }
                }
            }

            return { shouldPause: true, pausedPlatforms };
        }

        return { shouldPause: false, pausedPlatforms: [] };
    }

    /**
     * 更新熔断配置
     */
    setCircuitBreakerConfig(config: Partial<CircuitBreakerConfig>): void {
        this.circuitBreaker = { ...this.circuitBreaker, ...config };
        console.log('⚙️ [Circuit Breaker] Config updated:', this.circuitBreaker);
    }

    /**
     * 获取平台连接状态
     */
    getPlatformStatus(platform: DeliveryPlatform): PlatformConnection | undefined {
        return this.connections.get(platform);
    }

    /**
     * 获取所有平台状态
     */
    getAllPlatformStatus(): PlatformConnection[] {
        return Array.from(this.connections.values());
    }
}

// 单例导出
export const deliveryService = new DeliveryService();
export default deliveryService;
