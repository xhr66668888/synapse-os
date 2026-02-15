'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
    Settings,
    Store,
    Printer,
    CreditCard,
    Bell,
    Lock,
    Globe,
    Database,
    Save,
    Moon,
    Sun
} from 'lucide-react';

export function SettingsContent() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('restaurant');

    const tabs = [
        { id: 'restaurant', label: '餐厅信息', icon: Store },
        { id: 'printers', label: '打印机设置', icon: Printer },
        { id: 'payment', label: '支付配置', icon: CreditCard },
        { id: 'notifications', label: '通知设置', icon: Bell },
        { id: 'account', label: '账户安全', icon: Lock },
        { id: 'system', label: '系统设置', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-bg-secondary p-8 flex gap-8">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0">
                <h1 className="text-2xl font-bold text-text-primary mb-6 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-primary" /> 设置
                </h1>

                <div className="space-y-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                                        : 'text-text-secondary hover:bg-white hover:text-text-primary'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 max-w-3xl">
                <div className="card p-8 animate-fade-in">
                    {activeTab === 'restaurant' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-text-primary border-b border-border/50 pb-4">餐厅基本信息</h2>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">餐厅名称</label>
                                    <input type="text" className="input-field" defaultValue="Demo 餐厅" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">联系电话</label>
                                    <input type="text" className="input-field" defaultValue="555-0123" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-text-secondary mb-2">地址</label>
                                    <input type="text" className="input-field" defaultValue="123 Food Street, Tasty City" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-text-secondary mb-2">营业描述</label>
                                    <textarea className="input-field min-h-[100px]" defaultValue="We serve the best food in town!" />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button className="btn btn-primary px-8">
                                    <Save className="w-4 h-4 mr-2" /> 保存更改
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'system' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-text-primary border-b border-border/50 pb-4">系统偏好</h2>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Globe className="w-5 h-5 text-text-muted" />
                                        <div>
                                            <div className="font-medium text-text-primary">语言设置</div>
                                            <div className="text-xs text-text-muted">当前: 简体中文</div>
                                        </div>
                                    </div>
                                    <button className="btn btn-secondary text-sm">更改</button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Moon className="w-5 h-5 text-text-muted" />
                                        <div>
                                            <div className="font-medium text-text-primary">深色模式</div>
                                            <div className="text-xs text-text-muted">调整界面外观</div>
                                        </div>
                                    </div>
                                    <div className="flex bg-white rounded-lg p-1 border border-border/50">
                                        <button className="p-2 rounded hover:bg-gray-100"><Sun className="w-4 h-4" /></button>
                                        <button className="p-2 rounded bg-black text-white"><Moon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Placeholder for other tabs */}
                    {!['restaurant', 'system'].includes(activeTab) && (
                        <div className="text-center py-20 text-text-muted">
                            <div className="w-20 h-20 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4 text-4xl opacity-50">
                                🚧
                            </div>
                            <p>此功能模块正在开发中...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
