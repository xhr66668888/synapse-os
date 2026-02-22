'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, DollarSign, TrendingUp, CheckCircle2, Clock, ShoppingCart, ChefHat, Bot } from 'lucide-react';
import { api } from '@/lib/api';
import { StateBadge } from '@/components/ui';

const stats = [
    { label: '今日订单', value: '128', change: '+12%', icon: ClipboardList },
    { label: '营业额', value: '¥3,842', change: '+8%', icon: DollarSign },
    { label: '平均客单价', value: '¥30.02', change: '+3%', icon: TrendingUp },
    { label: '完成订单', value: '115', change: '+15%', icon: CheckCircle2 },
];

const recentOrders = [
    { id: '#1024', items: '宫保鸡丁 x2, 炒饭 x1', total: 32.50, status: 'preparing' as const, time: '2分钟前' },
    { id: '#1023', items: '麻婆豆腐 x1, 蒸饺 x2', total: 28.00, status: 'ready' as const, time: '5分钟前' },
    { id: '#1022', items: '红烧肉 x1, 米饭 x2', total: 25.80, status: 'completed' as const, time: '8分钟前' },
    { id: '#1021', items: '糖醋排骨 x1', total: 18.50, status: 'completed' as const, time: '12分钟前' },
];

export function DashboardContent() {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">仪表盘</h1>
                    <p className="text-text-secondary text-sm mt-1">欢迎回来，Demo 餐厅</p>
                </div>
                <span className="px-3 py-1.5 bg-surface-raised rounded-sm text-sm font-medium text-text-secondary border border-border">
                    {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="card-base p-5">
                            <div className="flex items-start justify-between">
                                <Icon className="w-5 h-5 text-text-muted" />
                                <span className="badge-ready text-[10px]">{stat.change}</span>
                            </div>
                            <div className="mt-3">
                                <div className="text-2xl font-bold text-text-primary font-mono tabular-nums">{stat.value}</div>
                                <div className="text-xs text-text-muted font-medium mt-1">{stat.label}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders */}
                <div className="lg:col-span-2 card-base p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-text-primary">最近订单</h2>
                        <Link href="/orders" className="text-sm font-bold text-info hover:underline">
                            查看全部
                        </Link>
                    </div>
                    <div className="space-y-1">
                        {recentOrders.map((order) => (
                            <div key={order.id} className="flex items-center justify-between p-3 rounded-sm hover:bg-surface-sunken transition-colors">
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-text-primary font-mono text-sm">{order.id}</span>
                                        <span className="text-xs text-text-muted flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {order.time}
                                        </span>
                                    </div>
                                    <div className="text-xs text-text-secondary">{order.items}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-text-primary font-mono tabular-nums text-sm">¥{order.total.toFixed(2)}</span>
                                    <StateBadge state={order.status} size="sm" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions & System Status */}
                <div className="space-y-6">
                    <div className="card-base p-5">
                        <h2 className="text-base font-bold text-text-primary mb-4">快捷操作</h2>
                        <div className="grid grid-cols-3 gap-2">
                            <ActionButton icon={ShoppingCart} label="新建订单" href="/pos" />
                            <ActionButton icon={ChefHat} label="厨房显示" href="/kds" />
                            <ActionButton icon={Bot} label="AI 接线" href="/ai-receptionist" />
                        </div>
                    </div>

                    <div className="card-base p-5">
                        <h2 className="text-base font-bold text-text-primary mb-4">系统状态</h2>
                        <div className="space-y-2">
                            <StatusItem label="API 服务" status="online" />
                            <StatusItem label="数据库" status="connected" />
                            <StatusItem label="Redis 缓存" status="connected" />
                            <StatusItem label="打印机服务" status="warning" message="缺纸" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActionButton({ icon: Icon, label, href }: { icon: React.ComponentType<{ className?: string }>; label: string; href: string }) {
    return (
        <Link href={href} className="flex flex-col items-center justify-center p-3 rounded-sm bg-surface-sunken hover:bg-border transition-colors">
            <Icon className="w-5 h-5 text-text-secondary mb-2" />
            <span className="text-xs font-bold text-text-secondary">{label}</span>
        </Link>
    );
}

function StatusItem({ label, status, message }: { label: string; status: 'online' | 'connected' | 'warning' | 'error'; message?: string }) {
    const dotColor = {
        online: 'bg-success',
        connected: 'bg-success',
        warning: 'bg-warning',
        error: 'bg-danger',
    };

    const badgeClass = {
        online: 'badge-ready',
        connected: 'badge-ready',
        warning: 'badge-pending',
        error: 'badge-danger',
    };

    const statusText = {
        online: '在线',
        connected: '已连接',
        warning: message || '警告',
        error: message || '错误',
    };

    return (
        <div className="flex items-center justify-between py-2 border-b border-border-light last:border-b-0">
            <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${dotColor[status]}`} />
                <span className="text-sm text-text-primary">{label}</span>
            </div>
            <span className={badgeClass[status]}>{statusText[status]}</span>
        </div>
    );
}
