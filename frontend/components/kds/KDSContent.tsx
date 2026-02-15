'use client';

import { useState, useEffect } from 'react';
import { useKDSWebSocket, KDSOrder } from '@/hooks/useKDSWebSocket';
import { useAuth } from '@/lib/auth';
import {
    Clock,
    ChefHat,
    CheckCircle2,
    MapPin,
    Utensils,
    AlertCircle,
    Wifi,
    WifiOff,
    Filter,
    Check
} from 'lucide-react';

// 备用 Mock 数据（当 WebSocket 未连接时使用）
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

const mockTypeConfig: Record<string, { label: string; bg: string; text: string }> = {
    dine_in: { label: '堂食', bg: 'bg-blue-100', text: 'text-blue-700' },
    takeout: { label: '外带', bg: 'bg-orange-100', text: 'text-orange-700' },
    delivery: { label: '外卖', bg: 'bg-green-100', text: 'text-green-700' },
};

export function KDSContent() {
    const { user } = useAuth();
    const restaurantId = user?.restaurantId || 'default';

    const {
        isConnected,
        orders: wsOrders,
        updateOrderStatus,
        reconnect
    } = useKDSWebSocket({
        restaurantId,
        onNewOrder: (order) => console.log('New order received:', order),
    });

    const [localOrders, setLocalOrders] = useState<KDSOrder[]>(mockOrders);
    const orders = isConnected && wsOrders.length > 0 ? wsOrders : localOrders;
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const pendingOrders = orders.filter((o) => o.status === 'pending');
    const preparingOrders = orders.filter((o) => o.status === 'preparing');
    const readyOrders = orders.filter((o) => o.status === 'ready');

    const getWaitTime = (createdAt: string) => {
        const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
        return diff;
    };

    const handleStatusUpdate = (orderId: string, newStatus: KDSOrder['status']) => {
        if (isConnected) {
            updateOrderStatus(orderId, newStatus);
        } else {
            setLocalOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
            );
        }
    };

    const handleComplete = (orderId: string) => {
        if (isConnected) {
            updateOrderStatus(orderId, 'ready');
        }
        setLocalOrders((prev) => prev.filter((o) => o.id !== orderId));
    };

    return (
        <div className="min-h-screen bg-[#1c1c1e] text-white font-sans">
            {/* Header */}
            <header className="px-6 py-4 bg-[#2c2c2e] border-b border-white/10 flex items-center justify-between shadow-lg z-10 relative">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <ChefHat className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold tracking-wide">KDS 厨房显示</h1>
                    <div className="h-6 w-px bg-white/20 mx-2" />
                    <span className="text-2xl font-mono text-blue-400 font-medium tracking-widest">
                        {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                <div className="flex items-center gap-6">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                        {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {isConnected ? '在线' : '离线'}
                    </div>

                    <div className="flex gap-2">
                        <FilterPill label="全部" count={orders.length} active />
                        <FilterPill label="待处理" count={pendingOrders.length} color="bg-yellow-500" />
                        <FilterPill label="制作中" count={preparingOrders.length} color="bg-blue-600" />
                    </div>
                </div>
            </header>

            {/* Board */}
            <div className="p-6 grid grid-cols-3 gap-6 h-[calc(100vh-88px)] overflow-hidden">
                <Column
                    title="待处理"
                    count={pendingOrders.length}
                    color="border-yellow-500"
                    headerColor="text-yellow-500"
                >
                    {pendingOrders.map((order) => (
                        <OrderTicket
                            key={order.id}
                            order={order}
                            waitTime={getWaitTime(order.createdAt)}
                            actionLabel="开始制作"
                            actionColor="bg-blue-600 hover:bg-blue-500"
                            onAction={() => handleStatusUpdate(order.id, 'preparing')}
                        />
                    ))}
                </Column>

                <Column
                    title="制作中"
                    count={preparingOrders.length}
                    color="border-blue-500"
                    headerColor="text-blue-500"
                >
                    {preparingOrders.map((order) => (
                        <OrderTicket
                            key={order.id}
                            order={order}
                            waitTime={getWaitTime(order.createdAt)}
                            actionLabel="完成制作"
                            actionColor="bg-green-600 hover:bg-green-500"
                            onAction={() => handleStatusUpdate(order.id, 'ready')}
                            isActive
                        />
                    ))}
                </Column>

                <Column
                    title="已完成"
                    count={readyOrders.length}
                    color="border-green-500"
                    headerColor="text-green-500"
                >
                    {readyOrders.map((order) => (
                        <OrderTicket
                            key={order.id}
                            order={order}
                            waitTime={getWaitTime(order.createdAt)}
                            actionLabel="取餐"
                            actionColor="bg-[#3a3a3c] hover:bg-[#48484a] text-gray-300"
                            onAction={() => handleComplete(order.id)}
                            isDone
                        />
                    ))}
                </Column>
            </div>
        </div>
    );
}

function FilterPill({ label, count, color, active }: { label: string; count: number; color?: string; active?: boolean }) {
    return (
        <div className={`px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-2 ${active ? 'bg-[#3a3a3c] text-white' : 'text-gray-400'}`}>
            {label}
            <span className={`px-1.5 rounded-md text-xs text-white ${color || 'bg-gray-600'}`}>{count}</span>
        </div>
    );
}

function Column({ title, count, color, headerColor, children }: { title: string; count: number; color: string; headerColor: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full bg-[#2c2c2e] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            <div className={`px-4 py-3 border-b-2 ${color} bg-[#3a3a3c] flex justify-between items-center`}>
                <h2 className={`font-bold text-lg ${headerColor}`}>{title}</h2>
                <span className="bg-[#1c1c1e] px-2 py-0.5 rounded text-sm text-gray-300 font-mono">{count}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {children}
            </div>
        </div>
    );
}

function OrderTicket({ order, waitTime, actionLabel, actionColor, onAction, isActive, isDone }: any) {
    const isUrgent = waitTime > 15 && !isDone;
    const typeConfig = mockTypeConfig[order.orderType] || mockTypeConfig.dine_in;

    return (
        <div className={`bg-[#1c1c1e] rounded-xl overflow-hidden border transition-all duration-300 ${isUrgent ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-white/5'
            } ${isDone ? 'opacity-60 grayscale-[0.5]' : ''}`}>

            {/* Ticket Header */}
            <div className="p-3 bg-[#252527] border-b border-white/5 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-bold text-white">{order.orderNumber}</span>
                        {isUrgent && <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${typeConfig.bg} ${typeConfig.text}`}>
                            {typeConfig.label}
                        </span>
                        {order.tableNumber && (
                            <span className="flex items-center gap-1 text-gray-400">
                                <MapPin className="w-3 h-3" /> {order.tableNumber}
                            </span>
                        )}
                    </div>
                </div>
                <div className={`text-right ${isUrgent ? 'text-red-400' : 'text-gray-400'}`}>
                    <div className="flex items-center justify-end gap-1 text-xs font-mono">
                        <Clock className="w-3 h-3" />
                        {waitTime}m
                    </div>
                </div>
            </div>

            {/* Ticket Items */}
            <div className="p-3 space-y-3">
                {order.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-start text-sm">
                        <div className="flex gap-3">
                            <span className="flex items-center justify-center w-5 h-5 rounded bg-[#3a3a3c] text-white font-bold text-xs">
                                {item.quantity}
                            </span>
                            <div className="flex flex-col">
                                <span className={item.quantity > 1 ? 'text-white font-medium' : 'text-gray-300'}>
                                    {item.name}
                                </span>
                                {item.tasteModifiers && (
                                    <span className="text-xs text-orange-400 mt-0.5">{item.tasteModifiers}</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Footer */}
            <div className="p-3 pt-0">
                <button
                    onClick={onAction}
                    className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.98] ${actionColor}`}
                >
                    {isDone ? <Check className="w-4 h-4" /> : null}
                    {actionLabel}
                </button>
            </div>
        </div>
    );
}
