'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, DollarSign, TrendingUp, CheckCircle2, Clock, Truck, ChefHat, ShoppingCart, Bot } from 'lucide-react';
import { api } from '@/lib/api';

// Mock 数据
const stats = [
    { label: '今日订单', value: 128, change: '+12%', icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: '营业额', value: '$3,842', change: '+8%', icon: DollarSign, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: '平均客单价', value: '$30.02', change: '+3%', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
    { label: '完成订单', value: 115, change: '+15%', icon: CheckCircle2, color: 'text-purple-500', bg: 'bg-purple-50' },
];

const recentOrders = [
    { id: '#1024', items: '宫保鸡丁 x2, 炒饭 x1', total: 32.50, status: 'preparing', time: '2分钟前' },
    { id: '#1023', items: '麻婆豆腐 x1, 蒸饺 x2', total: 28.00, status: 'ready', time: '5分钟前' },
    { id: '#1022', items: '红烧肉 x1, 米饭 x2', total: 25.80, status: 'completed', time: '8分钟前' },
    { id: '#1021', items: '糖醋排骨 x1', total: 18.50, status: 'completed', time: '12分钟前' },
];

const statusConfig: Record<string, { label: string; class: string }> = {
    preparing: { label: '制作中', class: 'bg-warning-bg text-warning' },
    ready: { label: '已完成', class: 'bg-success-bg text-success' },
    completed: { label: '已取餐', class: 'bg-blue-50 text-blue-600' },
};

export function DashboardContent() {
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary tracking-tight">仪表盘</h1>
                    <p className="text-text-secondary mt-1">欢迎回来，Demo 餐厅</p>
                </div>
                <div className="flex gap-3">
                    <span className="px-4 py-2 bg-white rounded-full text-sm font-medium text-text-secondary shadow-sm border border-border/50">
                        {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="card p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                            <div className="flex items-start justify-between">
                                <div className={`p-3 rounded-2xl ${stat.bg}`}>
                                    <Icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                                <span className="badge bg-success-bg text-success">{stat.change}</span>
                            </div>
                            <div className="mt-4">
                                <div className="text-3xl font-bold text-text-primary tracking-tight">{stat.value}</div>
                                <div className="text-sm text-text-muted font-medium mt-1">{stat.label}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Orders */}
                <div className="lg:col-span-2 card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-text-primary">最近订单</h2>
                        <Link href="/orders" className="text-sm font-medium text-primary hover:text-primary-dark transition-colors">
                            查看全部 →
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {recentOrders.map((order) => (
                            <div key={order.id} className="flex items-center justify-between p-4 rounded-xl bg-bg-secondary/50 hover:bg-bg-hover transition-colors border border-transparent hover:border-border/50">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-text-primary font-mono">{order.id}</span>
                                        <span className="text-xs text-text-muted flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {order.time}
                                        </span>
                                    </div>
                                    <div className="text-sm text-text-secondary">{order.items}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-text-primary">${order.total.toFixed(2)}</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[order.status].class}`}>
                                        {statusConfig[order.status].label}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions & System Status */}
                <div className="space-y-8">
                    {/* Quick Actions */}
                    <div className="card p-6">
                        <h2 className="text-xl font-bold text-text-primary mb-6">快捷操作</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <ActionButton icon={ShoppingCart} label="新建订单" href="/pos" color="blue" />
                            <ActionButton icon={ChefHat} label="厨房显示" href="/kds" color="orange" />
                            <ActionButton icon={Bot} label="AI 接线" href="/ai-receptionist" color="purple" />
                        </div>
                    </div>

                    {/* System Status */}
                    <div className="card p-6">
                        <h2 className="text-xl font-bold text-text-primary mb-6">系统状态</h2>
                        <div className="space-y-4">
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

function ActionButton({ icon: Icon, label, href, color }: { icon: any; label: string; href: string; color: string }) {
    const colorStyles: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
        orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
        purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    };

    return (
        <Link href={href} className="group flex flex-col items-center justify-center p-4 rounded-2xl bg-bg-secondary hover:bg-white border border-transparent hover:border-border transition-all duration-300 hover:shadow-lg">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${colorStyles[color]}`}>
                <Icon className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary">{label}</span>
        </Link>
    );
}

function StatusItem({ label, status, message }: { label: string; status: 'online' | 'connected' | 'warning' | 'error'; message?: string }) {
    const statusStyles = {
        online: 'bg-green-500',
        connected: 'bg-green-500',
        warning: 'bg-warning',
        error: 'bg-error',
    };

    const statusText = {
        online: '在线',
        connected: '已连接',
        warning: message || '警告',
        error: message || '错误',
    };

    const badgeStyles = {
        online: 'bg-green-50 text-green-600',
        connected: 'bg-green-50 text-green-600',
        warning: 'bg-warning-bg text-warning',
        error: 'bg-error-bg text-error',
    };

    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-bg-secondary/30">
            <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${statusStyles[status]} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
                <span className="text-sm font-medium text-text-primary">{label}</span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${badgeStyles[status]}`}>
                {statusText[status]}
            </span>
        </div>
    );
}
