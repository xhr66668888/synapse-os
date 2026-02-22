'use client';

import { useState, useEffect, useRef } from 'react';
import { useKDSWebSocket, KDSOrder } from '@/hooks/useKDSWebSocket';
import { useAuth } from '@/lib/auth';
import { useAudio } from '@/lib/audio';
import { TerminalProvider } from '@/lib/terminal-context';
import { MuteButton } from '@/components/ui/MuteButton';
import { OrderTicketCard, type UrgencyLevel } from '@/components/ui/OrderTicketCard';
import {
    ChefHat,
    Wifi,
    WifiOff,
} from 'lucide-react';

const mockOrders: KDSOrder[] = [
    {
        id: '1', orderNumber: '#1025', orderType: 'dine_in', tableNumber: '12',
        status: 'pending', createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
        items: [
            { name: '宫保鸡丁', quantity: 2, tasteModifiers: '少辣' },
            { name: '蛋炒饭', quantity: 1 },
        ],
    },
    {
        id: '2', orderNumber: '#1024', orderType: 'takeout',
        status: 'preparing', createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
        items: [
            { name: '麻婆豆腐', quantity: 1, tasteModifiers: '微辣' },
            { name: '红烧肉', quantity: 1 },
        ],
    },
    {
        id: '3', orderNumber: '#1026', orderType: 'dine_in', tableNumber: '5',
        status: 'pending', createdAt: new Date(Date.now() - 1 * 60000).toISOString(),
        items: [
            { name: '鱼香肉丝', quantity: 1 },
            { name: '米饭', quantity: 2 },
        ],
    },
    {
        id: '4', orderNumber: '#1023', orderType: 'takeout',
        status: 'ready', createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
        items: [
            { name: '糖醋排骨', quantity: 1 },
            { name: '扬州炒饭', quantity: 2 },
        ],
    },
];

const ORDER_TYPE_LABELS: Record<string, string> = {
    dine_in: '堂食',
    takeout: '外带',
    delivery: '外卖',
};

function KDSInner() {
    const { user } = useAuth();
    const restaurantId = user?.restaurantId || 'default';
    const { playKDSAlert } = useAudio();

    const {
        isConnected,
        orders: wsOrders,
        updateOrderStatus,
    } = useKDSWebSocket({
        restaurantId,
        onNewOrder: () => {},
    });

    const [localOrders, setLocalOrders] = useState<KDSOrder[]>(mockOrders);
    const orders = isConnected && wsOrders.length > 0 ? wsOrders : localOrders;
    const [currentTime, setCurrentTime] = useState(new Date());
    const [flashingOrderId, setFlashingOrderId] = useState<string | null>(null);
    const urgencyTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Urgency escalation timers
    useEffect(() => {
        const timers = urgencyTimers.current;

        // Clear old timers
        timers.forEach(clearTimeout);
        timers.clear();

        orders.forEach(order => {
            if (order.status === 'ready') return;

            const ageMs = Date.now() - new Date(order.createdAt).getTime();
            const warningMs = 15 * 60 * 1000 - ageMs;
            const criticalMs = 30 * 60 * 1000 - ageMs;

            if (warningMs > 0) {
                timers.set(`warn-${order.id}`, setTimeout(() => {
                    playKDSAlert('warning');
                }, warningMs));
            } else if (criticalMs > 0) {
                // Already past warning but not critical yet
                // Play warning periodically
                const interval = setInterval(() => {
                    playKDSAlert('warning');
                }, 30000);
                timers.set(`warn-interval-${order.id}`, interval as unknown as NodeJS.Timeout);
            }

            if (criticalMs > 0) {
                timers.set(`crit-${order.id}`, setTimeout(() => {
                    playKDSAlert('critical');
                    setFlashingOrderId(order.id);
                }, criticalMs));
            } else if (ageMs >= 30 * 60 * 1000) {
                // Already critical
                const interval = setInterval(() => {
                    playKDSAlert('critical');
                    setFlashingOrderId(order.id);
                }, 10000);
                timers.set(`crit-interval-${order.id}`, interval as unknown as NodeJS.Timeout);
            }
        });

        return () => {
            timers.forEach(clearTimeout);
            timers.clear();
        };
    }, [orders, playKDSAlert]);

    const pendingOrders = orders.filter(o => o.status === 'pending');
    const preparingOrders = orders.filter(o => o.status === 'preparing');
    const readyOrders = orders.filter(o => o.status === 'ready');

    const getWaitMinutes = (createdAt: string) =>
        Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);

    const handleStatusUpdate = (orderId: string, newStatus: KDSOrder['status']) => {
        if (isConnected) {
            updateOrderStatus(orderId, newStatus);
        } else {
            setLocalOrders(prev =>
                prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
            );
        }
        if (flashingOrderId === orderId) {
            setFlashingOrderId(null);
        }
    };

    const handleComplete = (orderId: string) => {
        if (isConnected) {
            updateOrderStatus(orderId, 'ready');
        }
        setLocalOrders(prev => prev.filter(o => o.id !== orderId));
        if (flashingOrderId === orderId) {
            setFlashingOrderId(null);
        }
    };

    const mapOrderToTicket = (order: KDSOrder) => ({
        items: order.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            notes: item.tasteModifiers || item.notes,
        })),
    });

    return (
        <div data-terminal="kds" className="min-h-screen bg-surface-dark text-text-inverse font-sans">
            {/* Critical flash overlay */}
            {flashingOrderId && (
                <div
                    className="fixed inset-0 z-50 bg-danger/20 animate-kds-blink pointer-events-auto"
                    onClick={() => setFlashingOrderId(null)}
                    role="alert"
                    aria-label="订单超时警报"
                />
            )}

            {/* Header */}
            <header className="px-4 py-3 bg-surface-dark-2 border-b border-surface-dark-3 flex items-center justify-between z-10 relative">
                <div className="flex items-center gap-3">
                    <ChefHat className="w-6 h-6 text-text-inverse" />
                    <h1 className="text-lg font-bold">KDS 厨房显示</h1>
                    <div className="h-5 w-px bg-surface-dark-3 mx-1" />
                    <span className="text-xl font-mono tabular-nums text-text-muted tracking-widest">
                        {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-xs text-xs font-bold ${
                        isConnected ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'
                    }`}>
                        {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {isConnected ? '在线' : '离线'}
                    </div>

                    <div className="flex gap-2 text-xs font-mono tabular-nums">
                        <span className="px-2 py-1 bg-warning-bg text-warning rounded-xs">
                            待处理 {pendingOrders.length}
                        </span>
                        <span className="px-2 py-1 bg-info-bg text-info rounded-xs">
                            制作中 {preparingOrders.length}
                        </span>
                        <span className="px-2 py-1 bg-success-bg text-success rounded-xs">
                            已完成 {readyOrders.length}
                        </span>
                    </div>

                    <MuteButton size="sm" />
                </div>
            </header>

            {/* Board */}
            <div className="p-4 grid grid-cols-3 gap-4 h-[calc(100vh-60px)] overflow-hidden">
                <KDSColumn title="待处理" count={pendingOrders.length} borderColor="border-l-warning">
                    {pendingOrders.map(order => {
                        const wait = getWaitMinutes(order.createdAt);
                        const ticket = mapOrderToTicket(order);
                        return (
                            <OrderTicketCard
                                key={order.id}
                                orderNumber={order.orderNumber.replace('#', '')}
                                orderType={ORDER_TYPE_LABELS[order.orderType]}
                                tableNumber={order.tableNumber}
                                waitMinutes={wait}
                                items={ticket.items}
                                actionLabel="开始制作"
                                onAction={() => handleStatusUpdate(order.id, 'preparing')}
                            />
                        );
                    })}
                </KDSColumn>

                <KDSColumn title="制作中" count={preparingOrders.length} borderColor="border-l-info">
                    {preparingOrders.map(order => {
                        const wait = getWaitMinutes(order.createdAt);
                        const ticket = mapOrderToTicket(order);
                        return (
                            <OrderTicketCard
                                key={order.id}
                                orderNumber={order.orderNumber.replace('#', '')}
                                orderType={ORDER_TYPE_LABELS[order.orderType]}
                                tableNumber={order.tableNumber}
                                waitMinutes={wait}
                                items={ticket.items}
                                actionLabel="完成制作"
                                onAction={() => handleStatusUpdate(order.id, 'ready')}
                            />
                        );
                    })}
                </KDSColumn>

                <KDSColumn title="已完成" count={readyOrders.length} borderColor="border-l-success">
                    {readyOrders.map(order => {
                        const wait = getWaitMinutes(order.createdAt);
                        const ticket = mapOrderToTicket(order);
                        return (
                            <OrderTicketCard
                                key={order.id}
                                orderNumber={order.orderNumber.replace('#', '')}
                                orderType={ORDER_TYPE_LABELS[order.orderType]}
                                tableNumber={order.tableNumber}
                                waitMinutes={wait}
                                items={ticket.items}
                                actionLabel="取餐"
                                onAction={() => handleComplete(order.id)}
                                urgencyLevel="normal"
                            />
                        );
                    })}
                </KDSColumn>
            </div>
        </div>
    );
}

function KDSColumn({ title, count, borderColor, children }: {
    title: string;
    count: number;
    borderColor: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col h-full bg-surface-dark-2 overflow-hidden">
            <div className={`px-4 py-2.5 border-l-4 ${borderColor} bg-surface-dark-3 flex justify-between items-center`}>
                <h2 className="font-bold text-base text-text-inverse">{title}</h2>
                <span className="px-2 py-0.5 bg-surface-dark text-text-muted text-sm font-mono tabular-nums">
                    {count}
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {children}
            </div>
        </div>
    );
}

export function KDSContent() {
    return (
        <TerminalProvider terminal="kds">
            <KDSInner />
        </TerminalProvider>
    );
}
