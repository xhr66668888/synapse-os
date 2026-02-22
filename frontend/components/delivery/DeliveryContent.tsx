'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StateBadge, PlatformBadge, SectionHeader } from '@/components/ui';
import {
    Truck,
    MapPin,
    Clock,
    Bike
} from 'lucide-react';

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
    driver?: { name: string; phone: string };
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

const statusLabels: Record<string, string> = {
    new: '新订单',
    preparing: '制作中',
    ready: '待取餐',
    picked_up: '配送中',
    delivered: '已送达',
    cancelled: '已取消',
};

export function DeliveryContent() {
    const [filterStatus, setFilterStatus] = useState('all');

    const filteredOrders = filterStatus === 'all'
        ? mockOrders
        : mockOrders.filter(o => o.status === filterStatus);

    return (
        <div className="min-h-screen bg-surface-base p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
                <SectionHeader
                    title="外卖聚合"
                    subtitle="统一管理来自各平台的订单"
                    count={mockOrders.length}
                    actions={
                        <Truck className="w-5 h-5 text-text-muted" />
                    }
                />

                <div className="flex border border-border rounded-sm overflow-hidden">
                    {['all', 'new', 'preparing', 'ready', 'picked_up'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 text-sm font-bold transition-colors ${
                                filterStatus === status
                                    ? 'bg-action text-action-fg'
                                    : 'text-text-secondary hover:bg-surface-sunken'
                            }`}
                        >
                            {status === 'all' ? '全部' : statusLabels[status]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => (
                    <div key={order.id} className="card-base flex flex-col">
                        <div className="p-4 flex-1">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <PlatformBadge platform={order.platform} />
                                    <div className="mt-2 font-bold text-base text-text-primary font-mono">{order.orderNumber}</div>
                                </div>
                                <StateBadge state={order.status === 'new' ? 'pending' : order.status as 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled'} />
                            </div>

                            {/* Info */}
                            <div className="space-y-2 text-sm border-t border-border-light pt-3">
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                                    <span className="text-text-secondary text-xs line-clamp-2">{order.address}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-text-muted" />
                                    <span className="text-text-secondary text-xs font-mono tabular-nums">预计送达: {order.estimatedDelivery}</span>
                                </div>
                                {order.driver && (
                                    <div className="flex items-center gap-2">
                                        <Bike className="w-4 h-4 text-text-muted" />
                                        <span className="text-text-secondary text-xs">骑手: {order.driver.name}</span>
                                    </div>
                                )}
                            </div>

                            {/* Items */}
                            <div className="mt-3 bg-surface-sunken rounded-sm p-2 text-xs text-text-muted space-y-0.5">
                                {order.items.map((item, i) => <div key={i}>{item}</div>)}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 bg-surface-sunken border-t border-border flex justify-between items-center">
                            <span className="font-bold text-text-primary font-mono tabular-nums">¥{order.total.toFixed(2)}</span>
                            {order.status === 'new' && (
                                <button className="btn-action-sm">接单</button>
                            )}
                            {order.status === 'preparing' && (
                                <button className="btn-success text-xs px-3 py-1.5" style={{ minHeight: '32px' }}>出餐</button>
                            )}
                            {order.status === 'ready' && (
                                <span className="badge-pending text-[10px]">等待取餐</span>
                            )}
                            {order.status === 'picked_up' && (
                                <span className="badge-preparing text-[10px]">配送中</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
