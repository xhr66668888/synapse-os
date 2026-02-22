'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StateBadge } from '@/components/ui';
import {
    Search,
    Clock,
    CreditCard,
    User,
    Utensils,
    Truck,
    Printer
} from 'lucide-react';

interface Order {
    id: string;
    orderNumber: string;
    tableNumber?: string;
    items: string[];
    total: number;
    status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
    type: 'dine_in' | 'takeout' | 'delivery';
    createdAt: string;
    customerName?: string;
}

const mockOrders: Order[] = [
    { id: '1', orderNumber: '#2024102401', tableNumber: 'A1', items: ['宫保鸡丁 x1', '米饭 x2'], total: 42.00, status: 'completed', type: 'dine_in', createdAt: '12:30' },
    { id: '2', orderNumber: '#2024102402', items: ['麻婆豆腐 x1', '水饺 x1'], total: 35.50, status: 'preparing', type: 'takeout', createdAt: '12:35' },
    { id: '3', orderNumber: '#2024102403', tableNumber: 'B3', items: ['水煮鱼 x1', '可乐 x2'], total: 98.00, status: 'pending', type: 'dine_in', createdAt: '12:38' },
    { id: '4', orderNumber: '#2024102404', items: ['扬州炒饭 x1'], total: 28.00, status: 'ready', type: 'delivery', createdAt: '12:40' },
    { id: '5', orderNumber: '#2024102405', tableNumber: 'C2', items: ['糖醋排骨 x1', '米饭 x1'], total: 60.00, status: 'cancelled', type: 'dine_in', createdAt: '12:15' },
];

const typeLabels: Record<string, string> = {
    dine_in: '堂食',
    takeout: '外带',
    delivery: '外卖',
};

export function OrdersContent() {
    const [filterStatus, setFilterStatus] = useState('all');
    const [activeOrder, setActiveOrder] = useState<Order | null>(null);

    const filteredOrders = filterStatus === 'all'
        ? mockOrders
        : mockOrders.filter(order => order.status === filterStatus);

    return (
        <div className="flex bg-surface-base h-[calc(100vh-64px)] overflow-hidden">
            {/* List Panel */}
            <div className="w-1/3 min-w-[320px] max-w-md border-r border-border flex flex-col bg-surface-raised">
                {/* Search & Filter */}
                <div className="p-3 border-b border-border space-y-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="搜索订单号、桌号..."
                            className="input-base pl-10"
                        />
                    </div>
                    <div className="flex gap-1 overflow-x-auto">
                        {['all', 'pending', 'preparing', 'ready'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-3 py-1.5 rounded-sm text-xs font-bold whitespace-nowrap transition-colors ${
                                    filterStatus === status
                                        ? 'bg-action text-action-fg'
                                        : 'bg-surface-sunken text-text-secondary hover:text-text-primary'
                                }`}
                            >
                                {status === 'all' ? '全部' : status === 'pending' ? '待处理' : status === 'preparing' ? '制作中' : '待取餐'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Order List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredOrders.map(order => (
                        <div
                            key={order.id}
                            onClick={() => setActiveOrder(order)}
                            className={`p-3 border-b border-border-light cursor-pointer transition-colors hover:bg-surface-sunken ${
                                activeOrder?.id === order.id
                                    ? 'bg-info-bg border-l-[3px] border-l-action'
                                    : 'border-l-[3px] border-l-transparent'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-text-primary text-sm font-mono">{order.orderNumber}</span>
                                    {order.tableNumber && (
                                        <span className="bg-surface-sunken text-text-secondary px-1.5 py-0.5 rounded-xs text-[10px] font-bold">
                                            {order.tableNumber}号
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-text-muted font-mono tabular-nums">{order.createdAt}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <StateBadge state={order.status} size="sm" />
                                <span className="font-bold text-text-primary font-mono tabular-nums text-sm">¥{order.total.toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail Panel */}
            <div className="flex-1 bg-surface-base p-6 flex flex-col items-center justify-center">
                {activeOrder ? (
                    <div className="w-full max-w-2xl card-base overflow-hidden animate-fade-in">
                        {/* Ticket Header */}
                        <div className="p-5 bg-action text-action-fg">
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="text-lg font-bold">订单详情</h2>
                                <div className="flex items-center gap-1.5 text-sm font-mono tabular-nums opacity-80">
                                    <Clock className="w-4 h-4" />
                                    {activeOrder.createdAt}
                                </div>
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-xs opacity-70">订单编号</div>
                                    <div className="text-2xl font-mono font-bold">{activeOrder.orderNumber}</div>
                                </div>
                                {activeOrder.tableNumber && (
                                    <div className="bg-surface-raised text-text-primary px-3 py-1.5 rounded-sm font-bold text-sm">
                                        {activeOrder.tableNumber}号桌
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Ticket Body */}
                        <div className="p-5">
                            <div className="space-y-4">
                                {/* Type & Status */}
                                <div className="flex items-center gap-3 p-3 bg-surface-sunken rounded-sm">
                                    <User className="w-5 h-5 text-text-muted" />
                                    <div>
                                        <div className="text-xs text-text-muted">订单类型</div>
                                        <div className="text-sm font-bold text-text-primary">{typeLabels[activeOrder.type]}</div>
                                    </div>
                                    <div className="ml-auto">
                                        <StateBadge state={activeOrder.status} />
                                    </div>
                                </div>

                                {/* Items */}
                                <div>
                                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">菜品明细</h3>
                                    <div className="border border-border rounded-sm overflow-hidden">
                                        {activeOrder.items.map((item, idx) => (
                                            <div key={idx} className="p-3 flex justify-between items-center border-b border-border-light last:border-b-0 hover:bg-surface-sunken transition-colors">
                                                <span className="text-sm text-text-primary">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="flex justify-between items-center pt-3 border-t border-border">
                                    <span className="font-bold text-text-secondary">总计金额</span>
                                    <span className="text-xl font-bold text-text-primary font-mono tabular-nums">¥{activeOrder.total.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Actions — confirm right, cancel left */}
                            <div className="flex items-center justify-between mt-6">
                                <button className="btn-ghost text-sm">
                                    <Printer className="w-4 h-4" /> 打印小票
                                </button>
                                <div className="flex gap-2">
                                    {activeOrder.status === 'pending' && (
                                        <>
                                            <button className="btn-danger text-sm">取消订单</button>
                                            <button className="btn-action text-sm">接单制作</button>
                                        </>
                                    )}
                                    {activeOrder.status === 'preparing' && (
                                        <button className="btn-success text-sm">制作完成</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-text-muted">
                        <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">选择左侧订单查看详情</p>
                    </div>
                )}
            </div>
        </div>
    );
}
