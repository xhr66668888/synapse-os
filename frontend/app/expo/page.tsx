'use client';

import { useState, useEffect } from 'react';
import { ChefHat, Clock, Check, Bell, Bot, RefreshCw } from 'lucide-react';
import { StateBadge } from '@/components/ui';

interface ExpoItem {
    itemId: string;
    menuItemName: string;
    quantity: number;
    seatNumber?: number;
    status: 'pending' | 'cooking' | 'ready' | 'served';
    isRobot: boolean;
    prepTime: number;
    firedAt?: string;
}

interface ExpoOrder {
    orderId: string;
    orderNumber: string;
    tableNumber: string;
    currentCourse: number;
    totalCourses: number;
    items: ExpoItem[];
    allReady: boolean;
}

export default function ExpoPage() {
    const [orders, setOrders] = useState<ExpoOrder[]>([]);

    useEffect(() => {
        setOrders([
            {
                orderId: '1', orderNumber: '#1925', tableNumber: '5',
                currentCourse: 1, totalCourses: 2,
                items: [
                    { itemId: 'i1', menuItemName: '宫保鸡丁', quantity: 1, status: 'cooking', isRobot: true, prepTime: 8 },
                    { itemId: 'i2', menuItemName: '青椒牛柳', quantity: 1, status: 'ready', isRobot: true, prepTime: 10 },
                    { itemId: 'i3', menuItemName: '蔬菜沙拉', quantity: 2, status: 'ready', isRobot: false, prepTime: 3 },
                ],
                allReady: false,
            },
            {
                orderId: '2', orderNumber: '#1926', tableNumber: '3',
                currentCourse: 1, totalCourses: 1,
                items: [
                    { itemId: 'i4', menuItemName: '红烧排骨', quantity: 1, status: 'cooking', isRobot: true, prepTime: 15 },
                    { itemId: 'i5', menuItemName: '糖醋里脊', quantity: 1, status: 'pending', isRobot: true, prepTime: 12 },
                ],
                allReady: false,
            },
            {
                orderId: '3', orderNumber: '#1924', tableNumber: '8',
                currentCourse: 1, totalCourses: 1,
                items: [
                    { itemId: 'i6', menuItemName: '麻婆豆腐', quantity: 1, status: 'ready', isRobot: true, prepTime: 6 },
                    { itemId: 'i7', menuItemName: '番茄炒蛋', quantity: 1, status: 'ready', isRobot: false, prepTime: 5 },
                    { itemId: 'i8', menuItemName: '白米饭', quantity: 3, status: 'ready', isRobot: false, prepTime: 0 },
                ],
                allReady: true,
            },
        ]);
    }, []);

    const markItemReady = (orderId: string, itemId: string) => {
        setOrders(prev => prev.map(order => {
            if (order.orderId === orderId) {
                const newItems = order.items.map(item =>
                    item.itemId === itemId ? { ...item, status: 'ready' as const } : item
                );
                return { ...order, items: newItems, allReady: newItems.every(i => i.status === 'ready') };
            }
            return order;
        }));
    };

    const markOrderServed = (orderId: string) => {
        setOrders(prev => prev.map(order => {
            if (order.orderId === orderId) {
                return { ...order, items: order.items.map(item => ({ ...item, status: 'served' as const })) };
            }
            return order;
        }));
    };

    const readyOrders = orders.filter(o => o.allReady && o.items.some(i => i.status !== 'served'));
    const inProgressOrders = orders.filter(o => !o.allReady);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Expo 出餐协调</h1>
                    <p className="text-sm text-text-secondary">统一协调机器人与厨师出餐，确保同桌菜品同时上桌</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-success-bg">
                        <span className="w-2 h-2 rounded-full bg-success" />
                        <span className="text-xs font-bold text-success">实时同步中</span>
                    </div>
                    <button className="btn-ghost text-sm">
                        <RefreshCw className="w-4 h-4" /> 刷新
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
                <SummaryCard icon={Clock} label="制作中" value={inProgressOrders.length} color="text-warning" />
                <SummaryCard icon={Check} label="待上桌" value={readyOrders.length} color="text-success" />
                <SummaryCard icon={Bot} label="机器人制作" value={orders.flatMap(o => o.items).filter(i => i.isRobot && i.status === 'cooking').length} color="text-info" />
                <SummaryCard icon={ChefHat} label="厨师制作" value={orders.flatMap(o => o.items).filter(i => !i.isRobot && i.status === 'cooking').length} color="text-warning" />
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Ready to Serve */}
                <div className="space-y-3">
                    <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                        <Bell className="w-4 h-4 text-success" />
                        待上桌
                        {readyOrders.length > 0 && (
                            <span className="badge-ready">{readyOrders.length}</span>
                        )}
                    </h2>
                    {readyOrders.length === 0 ? (
                        <div className="card-base p-12 text-center">
                            <Check className="w-10 h-10 mx-auto mb-2 text-text-disabled" />
                            <p className="text-sm text-text-muted">暂无待上桌订单</p>
                        </div>
                    ) : (
                        readyOrders.map(order => (
                            <div key={order.orderId} className="card-flat p-4 border-l-4 border-l-success">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold font-mono text-text-primary">{order.orderNumber}</span>
                                        <span className="badge-pending text-[10px]">桌 {order.tableNumber}</span>
                                    </div>
                                    <button onClick={() => markOrderServed(order.orderId)} className="btn-success text-xs">
                                        <Check className="w-3 h-3" /> 确认上桌
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {order.items.map(item => (
                                        <div key={item.itemId} className="flex items-center gap-1.5 p-2 rounded-sm bg-surface-sunken border border-border-light text-xs">
                                            {item.isRobot ? <Bot className="w-3 h-3 text-info flex-shrink-0" /> : <ChefHat className="w-3 h-3 text-warning flex-shrink-0" />}
                                            <span className="text-text-primary truncate">{item.menuItemName}</span>
                                            {item.quantity > 1 && <span className="text-text-muted flex-shrink-0">x{item.quantity}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* In Progress */}
                <div className="space-y-3">
                    <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                        <Clock className="w-4 h-4 text-warning" />
                        制作中
                        {inProgressOrders.length > 0 && (
                            <span className="badge-pending">{inProgressOrders.length}</span>
                        )}
                    </h2>
                    {inProgressOrders.length === 0 ? (
                        <div className="card-base p-12 text-center">
                            <Clock className="w-10 h-10 mx-auto mb-2 text-text-disabled" />
                            <p className="text-sm text-text-muted">暂无制作中订单</p>
                        </div>
                    ) : (
                        inProgressOrders.map(order => (
                            <div key={order.orderId} className="card-flat p-4 border-l-4 border-l-warning">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold font-mono text-text-primary">{order.orderNumber}</span>
                                        <span className="badge-pending text-[10px]">桌 {order.tableNumber}</span>
                                    </div>
                                    <span className="text-xs text-text-muted font-mono">
                                        课程 {order.currentCourse}/{order.totalCourses}
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    {order.items.map(item => (
                                        <div key={item.itemId} className="flex items-center justify-between p-2 rounded-sm bg-surface-sunken">
                                            <div className="flex items-center gap-2">
                                                {item.isRobot ? <Bot className="w-4 h-4 text-info" /> : <ChefHat className="w-4 h-4 text-warning" />}
                                                <div>
                                                    <div className="text-sm font-medium text-text-primary">{item.menuItemName}</div>
                                                    <div className="text-xs text-text-muted">
                                                        {item.quantity > 1 && `x${item.quantity} · `}预计 {item.prepTime} 分钟
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <StateBadge state={item.status === 'cooking' ? 'preparing' : item.status === 'ready' ? 'ready' : 'pending'} size="sm" />
                                                {item.status === 'cooking' && (
                                                    <button
                                                        onClick={() => markItemReady(order.orderId, item.itemId)}
                                                        className="p-1.5 rounded-xs bg-success-bg hover:bg-success text-success hover:text-success-fg transition-colors"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-3">
                                    <div className="flex justify-between text-xs text-text-muted mb-1">
                                        <span>进度</span>
                                        <span className="font-mono tabular-nums">{order.items.filter(i => i.status === 'ready').length}/{order.items.length}</span>
                                    </div>
                                    <div className="h-1.5 bg-surface-sunken rounded-xs overflow-hidden">
                                        <div
                                            className="h-full bg-success transition-all duration-300"
                                            style={{ width: `${(order.items.filter(i => i.status === 'ready').length / order.items.length) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }) {
    return (
        <div className="card-base p-4">
            <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <div>
                    <div className="text-xl font-bold text-text-primary font-mono tabular-nums">{value}</div>
                    <div className="text-xs text-text-muted">{label}</div>
                </div>
            </div>
        </div>
    );
}
