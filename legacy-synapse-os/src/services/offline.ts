// 离线缓存服务
// 使用 IndexedDB 实现断网容灾

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'synapse-os-offline';
const DB_VERSION = 1;

// 缓存的数据类型
interface CachedOrder {
    id: string;
    data: unknown;
    createdAt: Date;
    synced: boolean;
}

interface CachedMenuItem {
    id: string;
    data: unknown;
    updatedAt: Date;
}

// 初始化 IndexedDB
async function initDB(): Promise<IDBPDatabase> {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // 订单缓存
            if (!db.objectStoreNames.contains('orders')) {
                const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
                orderStore.createIndex('synced', 'synced');
                orderStore.createIndex('createdAt', 'createdAt');
            }

            // 菜单缓存
            if (!db.objectStoreNames.contains('menu')) {
                db.createObjectStore('menu', { keyPath: 'id' });
            }

            // 设置缓存
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        },
    });
}

/**
 * 离线缓存服务类
 */
class OfflineService {
    private db: IDBPDatabase | null = null;
    private isOnline: boolean = navigator.onLine;
    private syncQueue: Array<() => Promise<void>> = [];

    constructor() {
        this.init();
        this.setupNetworkListeners();
    }

    private async init() {
        try {
            this.db = await initDB();
            console.log('💾 [Offline] IndexedDB initialized');
        } catch (error) {
            console.error('💾 [Offline] Failed to initialize IndexedDB:', error);
        }
    }

    private setupNetworkListeners() {
        window.addEventListener('online', () => {
            console.log('🌐 [Offline] Back online');
            this.isOnline = true;
            this.syncPendingData();
        });

        window.addEventListener('offline', () => {
            console.log('📴 [Offline] Gone offline');
            this.isOnline = false;
        });
    }

    /**
     * 检查网络状态
     */
    getStatus(): { online: boolean; pendingSync: number } {
        return {
            online: this.isOnline,
            pendingSync: this.syncQueue.length,
        };
    }

    /**
     * 缓存订单（离线创建）
     */
    async cacheOrder(order: CachedOrder): Promise<void> {
        if (!this.db) return;

        await this.db.put('orders', {
            ...order,
            synced: this.isOnline ? true : false,
            createdAt: new Date(),
        });

        console.log('💾 [Offline] Order cached:', order.id);

        if (!this.isOnline) {
            // 添加到同步队列
            this.syncQueue.push(async () => {
                // TODO: 实际同步到服务器
                console.log('🔄 [Offline] Syncing order:', order.id);
                await this.db?.put('orders', { ...order, synced: true });
            });
        }
    }

    /**
     * 获取未同步的订单
     */
    async getPendingOrders(): Promise<CachedOrder[]> {
        if (!this.db) return [];

        const orders = await this.db.getAllFromIndex('orders', 'synced', false);
        return orders as CachedOrder[];
    }

    /**
     * 缓存菜单数据
     */
    async cacheMenu(items: CachedMenuItem[]): Promise<void> {
        if (!this.db) return;

        const tx = this.db.transaction('menu', 'readwrite');
        await Promise.all([
            ...items.map(item => tx.store.put(item)),
            tx.done,
        ]);

        console.log('💾 [Offline] Menu cached:', items.length, 'items');
    }

    /**
     * 获取缓存的菜单
     */
    async getCachedMenu(): Promise<CachedMenuItem[]> {
        if (!this.db) return [];
        return (await this.db.getAll('menu')) as CachedMenuItem[];
    }

    /**
     * 同步待处理数据
     */
    private async syncPendingData(): Promise<void> {
        if (this.syncQueue.length === 0) return;

        console.log('🔄 [Offline] Syncing', this.syncQueue.length, 'pending items...');

        while (this.syncQueue.length > 0) {
            const syncFn = this.syncQueue.shift();
            if (syncFn) {
                try {
                    await syncFn();
                } catch (error) {
                    console.error('🔄 [Offline] Sync failed:', error);
                    // 重新添加到队列
                    this.syncQueue.unshift(syncFn);
                    break;
                }
            }
        }

        console.log('✅ [Offline] Sync complete');
    }

    /**
     * 清除所有缓存
     */
    async clearCache(): Promise<void> {
        if (!this.db) return;

        const tx = this.db.transaction(['orders', 'menu', 'settings'], 'readwrite');
        await Promise.all([
            tx.objectStore('orders').clear(),
            tx.objectStore('menu').clear(),
            tx.objectStore('settings').clear(),
            tx.done,
        ]);

        console.log('🗑️ [Offline] Cache cleared');
    }
}

export const offlineService = new OfflineService();
export default offlineService;
