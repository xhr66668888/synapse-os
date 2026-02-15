'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Truck,
    MapPin,
    Navigation,
    Phone,
    Clock,
    MoreHorizontal,
    Filter,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Bike
} from 'lucide-react';

// Mock Sky
interface DeliveryOrder {
    id: string;
    platform: 'UberEats' | 'DoorDash' | 'GrubHub' | 'Fantuan';
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    address: string;
    items: string[];
    total: number;
    status: 'new' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
    driver?: {
        name: string;
        phone: string;
    };
    createdAt: string;
    estimatedDelivery: string;
}

const mockOrders: DeliveryOrder[] = [
    {
        id: '1', platform: 'UberEats', orderNumber: '#UE-19283', customerName: 'Alice Green', customerPhone: '555-0123',
        address: '123 Main St, Apt 4B', items: ['Spicy Chicken x1', 'Rice x2'], total: 28.50, status: 'new', createdAt: '18:30', estimatedDelivery: '19:10'
    },
    {
        id: '2', platform: 'DoorDash', orderNumber: '#DD-8821', customerName: 'Bob Brown', customerPhone: '555-0456',
        address: '456 Oak Ave', items: ['Beef Noodle Soup x2'], total: 32.00, status: 'preparing', driver: { name: 'David', phone: '555-9999' }, createdAt: '18:15', estimatedDelivery: '19:00'
    },
    {
        id: '3', platform: 'Fantuan', orderNumber: '#FT-6621', customerName: '张伟', customerPhone: '555-8888',
        address: '789 Pine Rd', items: ['Bubble Tea x4'], total: 24.00, status: 'ready', driver: { name: 'Li', phone: '555-7777' }, createdAt: '18:40', estimatedDelivery: '19:05'
    },
    {
        id: '4', platform: 'GrubHub', orderNumber: '#GH-1122', customerName: 'Carol White', customerPhone: '555-2222',
        address: '101 Elm St', items: ['Dumplings x1', 'Fried Rice x1'], total: 18.00, status: 'picked_up', driver: { name: 'Sam', phone: '555-3333' }, createdAt: '18:00', estimatedDelivery: '18:45'
    },
];

const platformConfig: Record<string, { label: string; bg: string; text: string }> = {
    UberEats: { label: 'Uber Eats', bg: 'bg-green-100', text: 'text-green-800' },
    DoorDash: { label: 'DoorDash', bg: 'bg-red-100', text: 'text-red-800' },
    GrubHub: { label: 'GrubHub', bg: 'bg-orange-100', text: 'text-orange-800' },
    Fantuan: { label: '饭团外卖', bg: 'bg-yellow-100', text: 'text-yellow-800' },
};

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
    new: { label: '新订单', icon: AlertTriangle, color: 'text-blue-500' },
    preparing: { label: '制作中', icon: Clock, color: 'text-orange-500' },
    ready: { label: '待取餐', icon: CheckCircle2, color: 'text-green-500' },
    picked_up: { label: '配送中', icon: Bike, color: 'text-purple-500' },
    delivered: { label: '已送达', icon: CheckCircle2, color: 'text-gray-500' },
    cancelled: { label: '已取消', icon: XCircle, color: 'text-red-500' },
};

export function DeliveryContent() {
    const [filterStatus, setFilterStatus] = useState('all');

    const filteredOrders = filterStatus === 'all'
        ? mockOrders
        : mockOrders.filter(o => o.status === filterStatus);

    return (
        <div className="min-h-screen bg-bg-secondary p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <Truck className="w-6 h-6 text-primary" /> 外卖聚合
                    </h1>
                    <p className="text-sm text-text-muted mt-1">
                        统一管理来自 Uber Eats, DoorDash, 饭团等平台的订单
                    </p>
                </div>

                <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-border/50">
                    {['all', 'new', 'preparing', 'ready', 'picked_up'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === status
                                    ? 'bg-black text-white shadow-md'
                                    : 'text-text-secondary hover:bg-gray-100'
                                }`}
                        >
                            {status === 'all' ? '全部' : statusConfig[status]?.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredOrders.map((order) => {
                    const StatusIcon = statusConfig[order.status].icon;
                    const platform = platformConfig[order.platform];

                    return (
                        <div key={order.id} className="card flex flex-col hover:shadow-hover transition-all duration-300 group border-l-4 border-l-transparent hover:border-l-primary">
                            <div className="p-5 flex-1">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${platform.bg} ${platform.text}`}>
                                            {platform.label}
                                        </span>
                                        <div className="mt-2 font-bold text-lg text-text-primary">{order.orderNumber}</div>
                                    </div>
                                    <div className={`flex items-center gap-1 text-xs font-medium ${statusConfig[order.status].color}`}>
                                        <StatusIcon className="w-4 h-4" />
                                        {statusConfig[order.status].label}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="space-y-3 text-sm border-t border-border/50 pt-4">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                                        <span className="text-text-secondary line-clamp-2">{order.address}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-4 h-4 text-text-muted" />
                                        <span className="text-text-secondary">预计送达: {order.estimatedDelivery}</span>
                                    </div>
                                    {order.driver && (
                                        <div className="flex items-center gap-3">
                                            <Bike className="w-4 h-4 text-text-muted" />
                                            <span className="text-text-secondary">骑手: {order.driver.name}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Items preview */}
                                <div className="mt-4 bg-bg-secondary/50 rounded-lg p-3 text-xs text-text-muted space-y-1">
                                    {order.items.map((item, i) => <div key={i}>• {item}</div>)}
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="p-4 bg-bg-secondary/30 border-t border-border/50 flex justify-between items-center">
                                <span className="font-bold text-lg text-text-primary">¥{order.total.toFixed(2)}</span>
                                {order.status === 'new' && (
                                    <button className="btn btn-primary text-xs px-4">接单</button>
                                )}
                                {order.status === 'preparing' && (
                                    <button className="btn btn-primary text-xs px-4">出餐</button>
                                )}
                                {order.status === 'ready' && (
                                    <button className="btn btn-secondary text-xs px-4 disabled:opacity-50" disabled>等待取餐</button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
