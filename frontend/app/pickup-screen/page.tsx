'use client';

import { useState, useEffect } from 'react';
import { Check, Clock, ChefHat, Bell } from 'lucide-react';
import { TerminalProvider } from '@/lib/terminal-context';
import { useAudio } from '@/lib/audio';

interface Order {
    id: string;
    orderNumber: string;
    status: 'preparing' | 'ready' | 'picked_up';
    items: string[];
    estimatedTime?: number;
}

function PickupScreenInner() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const { speak, playNewOrder } = useAudio();

    useEffect(() => {
        setOrders([
            { id: '1', orderNumber: 'A001', status: 'ready', items: ['宫保鸡丁', '麻婆豆腐', '米饭x2'] },
            { id: '2', orderNumber: 'A002', status: 'ready', items: ['红烧肉', '清蒸鱼', '米饭x2'] },
            { id: '3', orderNumber: 'A003', status: 'preparing', items: ['水煮牛肉', '拍黄瓜'], estimatedTime: 5 },
            { id: '4', orderNumber: 'A004', status: 'preparing', items: ['麻辣香锅', '酸辣汤'], estimatedTime: 8 },
        ]);

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        const orderTimer = setInterval(() => {
            setOrders(prev => prev.map(order => {
                if (order.status === 'preparing' && Math.random() > 0.8) {
                    playNewOrder();
                    speak(`${order.orderNumber}号，请取餐`);
                    return { ...order, status: 'ready' as const };
                }
                return order;
            }));
        }, 5000);

        return () => { clearInterval(timer); clearInterval(orderTimer); };
    }, [speak, playNewOrder]);

    const readyOrders = orders.filter(o => o.status === 'ready');
    const preparingOrders = orders.filter(o => o.status === 'preparing');

    return (
        <div className="min-h-screen bg-surface-dark text-text-inverse p-8">
            {/* Header */}
            <div className="text-center mb-10">
                <h1 className="text-5xl font-bold text-text-inverse mb-3">取餐通知</h1>
                <div className="text-2xl font-mono tabular-nums text-text-muted tracking-widest">
                    {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                {/* Ready */}
                <div className="mb-10">
                    <div className="flex items-center mb-6">
                        <Bell className="w-8 h-8 text-success mr-3" />
                        <h2 className="text-3xl font-bold text-success">
                            可以取餐 ({readyOrders.length})
                        </h2>
                    </div>
                    {readyOrders.length > 0 ? (
                        <div className="grid grid-cols-4 gap-4">
                            {readyOrders.map(order => (
                                <div key={order.id} className="bg-surface-raised rounded-sm p-6 border-l-8 border-l-success">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-7xl font-black font-mono text-text-primary">{order.orderNumber}</div>
                                        <Check className="w-12 h-12 text-success" strokeWidth={3} />
                                    </div>
                                    <div className="bg-surface-sunken rounded-sm p-3 text-sm text-text-secondary space-y-1">
                                        {order.items.slice(0, 3).map((item, idx) => (
                                            <div key={idx}>{item}</div>
                                        ))}
                                        {order.items.length > 3 && (
                                            <div className="text-text-muted">...等{order.items.length}项</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-lg text-text-muted">暂无可取订单</div>
                    )}
                </div>

                {/* Preparing */}
                <div>
                    <div className="flex items-center mb-6">
                        <ChefHat className="w-8 h-8 text-warning mr-3" />
                        <h2 className="text-3xl font-bold text-warning">
                            准备中 ({preparingOrders.length})
                        </h2>
                    </div>
                    {preparingOrders.length > 0 ? (
                        <div className="grid grid-cols-4 gap-4">
                            {preparingOrders.map(order => (
                                <div key={order.id} className="bg-surface-dark-2 rounded-sm p-6 border border-surface-dark-3">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-5xl font-black font-mono text-text-muted">{order.orderNumber}</div>
                                        <Clock className="w-8 h-8 text-text-muted" />
                                    </div>
                                    {order.estimatedTime && (
                                        <div className="bg-surface-dark-3 rounded-sm p-3 mb-3 text-center">
                                            <div className="text-xs text-text-muted">预计还需</div>
                                            <div className="text-3xl font-bold font-mono tabular-nums text-warning">{order.estimatedTime} 分钟</div>
                                        </div>
                                    )}
                                    <div className="text-xs text-text-muted space-y-0.5">
                                        {order.items.slice(0, 2).map((item, idx) => (
                                            <div key={idx}>{item}</div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-lg text-text-muted">暂无准备中订单</div>
                    )}
                </div>
            </div>

            {/* Bottom */}
            <div className="fixed bottom-0 left-0 right-0 bg-surface-dark-2 border-t border-surface-dark-3 p-4 text-center">
                <p className="text-sm text-text-muted">听到您的订单号后，请到取餐台领取</p>
            </div>
        </div>
    );
}

export default function PickupScreenPage() {
    return (
        <TerminalProvider terminal="pickup-screen">
            <PickupScreenInner />
        </TerminalProvider>
    );
}
