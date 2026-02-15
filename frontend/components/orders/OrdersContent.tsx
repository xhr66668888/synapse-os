'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Search,
    Filter,
    ChevronDown,
    Clock,
    CreditCard,
    User,
    Utensils,
    CheckCircle2,
    XCircle,
    ChefHat,
    Truck,
    MoreHorizontal,
    Printer
} from 'lucide-react';

// Mock Sky
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

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: any }> = {
    pending: { label: '待处理', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
    preparing: { label: '制作中', bg: 'bg-blue-100', text: 'text-blue-700', icon: ChefHat },
    ready: { label: '待取餐', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
    completed: { label: '已完成', bg: 'bg-gray-100', text: 'text-gray-600', icon: CheckCircle2 },
    cancelled: { label: '已取消', bg: 'bg-red-50', text: 'text-red-600', icon: XCircle },
};

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
    dine_in: { label: '堂食', icon: Utensils, color: 'text-blue-500' },
    takeout: { label: '外带', icon: User, color: 'text-orange-500' },
    delivery: { label: '外卖', icon: Truck, color: 'text-green-500' },
};

export function OrdersContent() {
    const [filterStatus, setFilterStatus] = useState('all');
    const [activeOrder, setActiveOrder] = useState<Order | null>(null);

    const filteredOrders = filterStatus === 'all'
        ? mockOrders
        : mockOrders.filter(order => order.status === filterStatus);

    return (
        <div className="flex bg-bg-secondary h-[calc(100vh-64px)] overflow-hidden">
            {/* List Panel */}
            <div className="w-1/3 min-w-[320px] max-w-md border-r border-border flex flex-col bg-white">
                {/* Search & Filter */}
                <div className="p-4 border-b border-border/50 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="搜索订单号、桌号..."
                            className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {['all', 'pending', 'preparing', 'ready'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${filterStatus === status
                                        ? 'bg-primary text-white'
                                        : 'bg-bg-secondary text-text-secondary hover:bg-bg-hover'
                                    }`}
                            >
                                {status === 'all' ? '全部' : statusConfig[status]?.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Order List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredOrders.map(order => {
                        const StatusIcon = statusConfig[order.status].icon;
                        const TypeIcon = typeConfig[order.type].icon;

                        return (
                            <div
                                key={order.id}
                                onClick={() => setActiveOrder(order)}
                                className={`p-4 border-b border-border/50 cursor-pointer transition-colors hover:bg-bg-hover/50 ${activeOrder?.id === order.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-text-primary text-sm">{order.orderNumber}</span>
                                        {order.tableNumber && (
                                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                {order.tableNumber}号
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-text-muted font-mono">{order.createdAt}</span>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 font-medium ${statusConfig[order.status].bg} ${statusConfig[order.status].text}`}>
                                            <StatusIcon className="w-3 h-3" /> {statusConfig[order.status].label}
                                        </span>
                                        <TypeIcon className={`w-3 h-3 ${typeConfig[order.type].color}`} />
                                    </div>
                                    <span className="font-bold text-text-primary">¥{order.total.toFixed(2)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Detail Panel */}
            <div className="flex-1 bg-bg-secondary p-8 flex flex-col items-center justify-center">
                {activeOrder ? (
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden animate-fade-in border border-border/50">
                        {/* Ticket Header */}
                        <div className={`p-6 text-white bg-gradient-to-r ${activeOrder.status === 'completed' ? 'from-green-500 to-green-600' :
                                activeOrder.status === 'cancelled' ? 'from-gray-500 to-gray-600' :
                                    'from-primary to-primary-dark'
                            }`}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold tracking-tight">订单详情</h2>
                                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm font-medium">{activeOrder.createdAt}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="opacity-80 text-sm">订单编号</div>
                                    <div className="text-3xl font-mono font-bold">{activeOrder.orderNumber}</div>
                                </div>
                                {activeOrder.tableNumber && (
                                    <div className="bg-white text-primary px-4 py-2 rounded-xl font-bold shadow-lg">
                                        {activeOrder.tableNumber}号桌
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Ticket Body */}
                        <div className="p-8">
                            <div className="space-y-6">
                                {/* Customer Info */}
                                <div className="flex items-center gap-4 p-4 bg-bg-secondary/50 rounded-xl border border-border/50">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-text-muted">顾客类型</div>
                                        <div className="font-medium text-text-primary flex items-center gap-2">
                                            {typeConfig[activeOrder.type].label}
                                            <span className="text-xs text-text-secondary font-normal">(普通顾客)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Items */}
                                <div>
                                    <h3 className="text-sm font-medium text-text-muted mb-3 flex items-center gap-2">
                                        <Utensils className="w-4 h-4" /> 菜品明细
                                    </h3>
                                    <div className="divide-y divide-border-light border rounded-xl overflow-hidden">
                                        {activeOrder.items.map((item, idx) => (
                                            <div key={idx} className="p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors">
                                                <span className="font-medium text-text-primary">{item}</span>
                                                <span className="text-text-primary font-mono">--</span> {/* Quantity/Price split in mock is tricky, using raw string */}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Payment */}
                                <div className="flex justify-between items-center pt-4 border-t border-dashed border-gray-300">
                                    <span className="font-medium text-text-secondary">总计金额</span>
                                    <span className="text-2xl font-bold text-primary">¥{activeOrder.total.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-3 gap-4 mt-8">
                                <button className="btn btn-secondary flex items-center justify-center gap-2">
                                    <Printer className="w-4 h-4" /> 打印小票
                                </button>
                                {activeOrder.status === 'pending' && (
                                    <>
                                        <button className="btn btn-secondary text-error hover:bg-red-50 hover:border-red-100">取消订单</button>
                                        <button className="btn btn-primary">接单制作</button>
                                    </>
                                )}
                                {activeOrder.status === 'preparing' && (
                                    <button className="btn btn-primary col-span-2">制作完成</button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-text-muted">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CreditCard className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-lg font-medium">选择左侧订单查看详情</p>
                    </div>
                )}
            </div>
        </div>
    );
}
