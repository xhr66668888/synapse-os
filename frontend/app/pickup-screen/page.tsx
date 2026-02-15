'use client';

import { useState, useEffect } from 'react';
import { Check, Clock, ChefHat, Bell } from 'lucide-react';

interface Order {
    id: string;
    orderNumber: string;
    status: 'preparing' | 'ready' | 'picked_up';
    items: string[];
    estimatedTime?: number;
}

export default function PickupScreenPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        // 模拟订单数据
        const mockOrders: Order[] = [
            {
                id: '1',
                orderNumber: 'A001',
                status: 'ready',
                items: ['宫保鸡丁', '麻婆豆腐', '米饭x2']
            },
            {
                id: '2',
                orderNumber: 'A002',
                status: 'ready',
                items: ['红烧肉', '清蒸鱼', '米饭x2']
            },
            {
                id: '3',
                orderNumber: 'A003',
                status: 'preparing',
                items: ['水煮牛肉', '拍黄瓜'],
                estimatedTime: 5
            },
            {
                id: '4',
                orderNumber: 'A004',
                status: 'preparing',
                items: ['麻辣香锅', '酸辣汤'],
                estimatedTime: 8
            },
        ];
        setOrders(mockOrders);

        // 更新时间
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        // 模拟订单状态更新
        const orderTimer = setInterval(() => {
            setOrders(prev => {
                // 随机更新订单状态
                return prev.map(order => {
                    if (order.status === 'preparing' && Math.random() > 0.8) {
                        return { ...order, status: 'ready' as const };
                    }
                    return order;
                });
            });
        }, 5000);

        return () => {
            clearInterval(timer);
            clearInterval(orderTimer);
        };
    }, []);

    const readyOrders = orders.filter(o => o.status === 'ready');
    const preparingOrders = orders.filter(o => o.status === 'preparing');

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white p-8">
            {/* 头部 */}
            <div className="text-center mb-12">
                <h1 className="text-6xl font-bold mb-4">
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        取餐通知
                    </span>
                </h1>
                <div className="text-3xl font-light opacity-80">
                    {currentTime.toLocaleTimeString('zh-CN', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                    })}
                </div>
            </div>

            {/* 主内容区域 */}
            <div className="max-w-7xl mx-auto">
                {/* 准备就绪区域 */}
                <div className="mb-12">
                    <div className="flex items-center mb-8">
                        <Bell className="w-12 h-12 text-green-400 mr-4 animate-bounce" />
                        <h2 className="text-4xl font-bold text-green-400">
                            可以取餐 ({readyOrders.length})
                        </h2>
                    </div>
                    
                    {readyOrders.length > 0 ? (
                        <div className="grid grid-cols-4 gap-6">
                            {readyOrders.map((order) => (
                                <OrderCard key={order.id} order={order} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-2xl text-blue-300">
                            暂无可取订单
                        </div>
                    )}
                </div>

                {/* 准备中区域 */}
                <div>
                    <div className="flex items-center mb-8">
                        <ChefHat className="w-12 h-12 text-orange-400 mr-4" />
                        <h2 className="text-4xl font-bold text-orange-400">
                            准备中 ({preparingOrders.length})
                        </h2>
                    </div>
                    
                    {preparingOrders.length > 0 ? (
                        <div className="grid grid-cols-4 gap-6">
                            {preparingOrders.map((order) => (
                                <PreparingCard key={order.id} order={order} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-2xl text-blue-300">
                            暂无准备中订单
                        </div>
                    )}
                </div>
            </div>

            {/* 底部提示 */}
            <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-30 backdrop-blur-sm p-6 text-center">
                <p className="text-2xl font-light">
                    听到您的订单号后，请到取餐台领取 · 感谢您的耐心等待
                </p>
            </div>
        </div>
    );
}

function OrderCard({ order }: { order: Order }) {
    return (
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-transform animate-pulse-slow">
            <div className="flex items-center justify-between mb-6">
                <div className="text-6xl font-black">{order.orderNumber}</div>
                <Check className="w-16 h-16 text-white" strokeWidth={3} />
            </div>
            <div className="bg-white bg-opacity-20 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-sm opacity-80 mb-2">订单内容:</div>
                <div className="space-y-1">
                    {order.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="text-lg font-medium truncate">
                            • {item}
                        </div>
                    ))}
                    {order.items.length > 3 && (
                        <div className="text-sm opacity-70">
                            ...等{order.items.length}项
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function PreparingCard({ order }: { order: Order }) {
    return (
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 shadow-2xl border-2 border-blue-400">
            <div className="flex items-center justify-between mb-6">
                <div className="text-5xl font-black">{order.orderNumber}</div>
                <Clock className="w-12 h-12 text-blue-200" />
            </div>
            {order.estimatedTime && (
                <div className="bg-white bg-opacity-10 rounded-2xl p-4 mb-4 backdrop-blur-sm text-center">
                    <div className="text-sm opacity-80">预计还需</div>
                    <div className="text-4xl font-bold">{order.estimatedTime} 分钟</div>
                </div>
            )}
            <div className="bg-white bg-opacity-10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-xs opacity-70 mb-2">订单内容:</div>
                <div className="space-y-1">
                    {order.items.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="text-sm font-medium truncate">
                            • {item}
                        </div>
                    ))}
                    {order.items.length > 2 && (
                        <div className="text-xs opacity-60">
                            ...等{order.items.length}项
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
