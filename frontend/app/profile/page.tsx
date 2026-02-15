'use client';

import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import {
    Store,
    Mail,
    Phone,
    MapPin,
    Clock,
    CreditCard,
    Shield,
    Bell,
    LogOut,
    Settings
} from 'lucide-react';

export default function ProfilePage() {
    const { user, logout } = useAuth();

    // 餐厅信息 (管理员视角)
    const restaurantInfo = {
        name: user?.restaurantName || 'Demo 餐厅',
        address: '123 Main Street, City',
        phone: '(555) 123-4567',
        email: 'contact@demorestaurant.com',
        openHours: '11:00 - 22:00',
        timezone: 'Asia/Shanghai',
        subscription: 'Pro Plan',
        subscriptionStatus: '活跃',
    };

    const adminInfo = {
        name: user?.name || '管理员',
        role: user?.role || 'admin',
        email: user?.email || 'admin@restaurant.com',
        lastLogin: '2026-01-28 10:30',
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
                    <Store className="w-8 h-8 text-primary" />
                    餐厅账户
                </h1>
                <p className="text-text-secondary mt-1">管理餐厅信息和管理员账户</p>
            </div>

            <div className="grid grid-cols-2 gap-8">
                {/* 餐厅信息卡片 */}
                <div className="card p-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <Image
                            src="/profile.jpeg"
                            alt="Restaurant"
                            width={80}
                            height={80}
                            className="w-20 h-20 rounded-xl object-cover shadow-lg"
                        />
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">{restaurantInfo.name}</h2>
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                                {restaurantInfo.subscription}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3 text-text-secondary">
                            <MapPin className="w-4 h-4 text-text-muted" />
                            {restaurantInfo.address}
                        </div>
                        <div className="flex items-center gap-3 text-text-secondary">
                            <Phone className="w-4 h-4 text-text-muted" />
                            {restaurantInfo.phone}
                        </div>
                        <div className="flex items-center gap-3 text-text-secondary">
                            <Mail className="w-4 h-4 text-text-muted" />
                            {restaurantInfo.email}
                        </div>
                        <div className="flex items-center gap-3 text-text-secondary">
                            <Clock className="w-4 h-4 text-text-muted" />
                            营业时间: {restaurantInfo.openHours}
                        </div>
                    </div>

                    <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
                        <Settings className="w-4 h-4" /> 编辑餐厅信息
                    </button>
                </div>

                {/* 管理员信息 */}
                <div className="card p-6 space-y-6">
                    <h3 className="font-bold text-text-primary text-lg">管理员账户</h3>

                    <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
                            <span className="text-text-muted">账户名称</span>
                            <span className="font-medium text-text-primary">{adminInfo.name}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
                            <span className="text-text-muted">角色</span>
                            <span className="font-medium text-text-primary capitalize">{adminInfo.role}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
                            <span className="text-text-muted">邮箱</span>
                            <span className="font-medium text-text-primary">{adminInfo.email}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
                            <span className="text-text-muted">上次登录</span>
                            <span className="font-medium text-text-primary">{adminInfo.lastLogin}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button className="flex-1 btn btn-secondary flex items-center justify-center gap-2">
                            <Shield className="w-4 h-4" /> 修改密码
                        </button>
                        <button
                            onClick={logout}
                            className="flex-1 btn btn-ghost text-error hover:bg-red-50 flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-4 h-4" /> 退出登录
                        </button>
                    </div>
                </div>
            </div>

            {/* 快捷设置 */}
            <div className="card p-6">
                <h3 className="font-bold text-text-primary text-lg mb-4">快捷设置</h3>
                <div className="grid grid-cols-3 gap-4">
                    <QuickSettingCard
                        icon={<Bell className="w-5 h-5" />}
                        title="通知设置"
                        description="新订单、库存提醒"
                        href="/settings"
                    />
                    <QuickSettingCard
                        icon={<CreditCard className="w-5 h-5" />}
                        title="订阅管理"
                        description="Pro Plan, 有效期 2026-12"
                        href="/settings"
                    />
                    <QuickSettingCard
                        icon={<Shield className="w-5 h-5" />}
                        title="安全设置"
                        description="双因素认证, 访问日志"
                        href="/settings"
                    />
                </div>
            </div>
        </div>
    );
}

function QuickSettingCard({ icon, title, description, href }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    href: string;
}) {
    return (
        <a
            href={href}
            className="p-4 rounded-xl border border-border hover:border-primary hover:bg-primary-100/30 transition-all group cursor-pointer"
        >
            <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center text-text-muted group-hover:text-primary group-hover:bg-primary-100 transition-colors mb-3">
                {icon}
            </div>
            <h4 className="font-medium text-text-primary">{title}</h4>
            <p className="text-xs text-text-muted mt-1">{description}</p>
        </a>
    );
}
