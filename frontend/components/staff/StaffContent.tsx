'use client';

import { useState } from 'react';
import {
    Users,
    Search,
    UserPlus,
    Phone,
    Mail,
    Calendar,
    Shield,
    ChefHat,
    Coffee,
    DollarSign
} from 'lucide-react';

interface Staff {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'manager' | 'server' | 'chef' | 'cashier' | 'host';
    hourlyRate: number;
    isActive: boolean;
    hireDate: string;
    shift: 'morning' | 'evening' | 'full';
}

const mockStaff: Staff[] = [
    { id: '1', name: '店长·王', email: 'manager@demo.com', phone: '13800138000', role: 'manager', hourlyRate: 30, isActive: true, hireDate: '2023-01-15', shift: 'full' },
    { id: '2', name: '主厨·李', email: 'chef@demo.com', phone: '13900139000', role: 'chef', hourlyRate: 25, isActive: true, hireDate: '2023-03-10', shift: 'evening' },
    { id: '3', name: '服务员·张', email: 'server1@demo.com', phone: '13700137000', role: 'server', hourlyRate: 15, isActive: true, hireDate: '2023-06-01', shift: 'morning' },
    { id: '4', name: '收银员·赵', email: 'cashier@demo.com', phone: '13600136000', role: 'cashier', hourlyRate: 16, isActive: true, hireDate: '2023-06-15', shift: 'full' },
    { id: '5', name: '兼职·小陈', email: 'pt@demo.com', phone: '13500135000', role: 'server', hourlyRate: 14, isActive: false, hireDate: '2023-09-01', shift: 'evening' },
];

const roleConfig: Record<string, { label: string; icon: any }> = {
    manager: { label: '店长', icon: Shield },
    chef: { label: '厨师', icon: ChefHat },
    server: { label: '服务员', icon: Coffee },
    cashier: { label: '收银员', icon: DollarSign },
    host: { label: '接待', icon: Users },
};

const shiftLabels: Record<string, string> = {
    morning: '早班',
    evening: '晚班',
    full: '全天',
};

export function StaffContent() {
    const [activeRole, setActiveRole] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredStaff = mockStaff.filter(staff =>
        (activeRole === 'all' || staff.role === activeRole) &&
        (staff.name.toLowerCase().includes(searchQuery.toLowerCase()) || staff.phone.includes(searchQuery))
    );

    return (
        <div className="min-h-screen bg-surface-base p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">员工管理</h1>
                    <p className="text-sm text-text-muted mt-1">
                        在职员工 <span className="text-text-primary font-bold font-mono tabular-nums">{mockStaff.filter(s => s.isActive).length}</span> 人
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="搜索员工姓名或电话..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-base pl-9 w-60 text-sm"
                        />
                    </div>
                    <button className="btn-action text-sm">
                        <UserPlus className="w-4 h-4" /> 添加员工
                    </button>
                </div>
            </div>

            {/* Role Filter */}
            <div className="flex gap-2 mb-5 overflow-x-auto">
                <button
                    onClick={() => setActiveRole('all')}
                    className={`px-4 py-2 rounded-sm text-sm font-bold whitespace-nowrap transition-colors ${
                        activeRole === 'all' ? 'bg-action text-action-fg' : 'bg-surface-raised text-text-secondary border border-border hover:bg-surface-sunken'
                    }`}
                >
                    全部
                </button>
                {Object.entries(roleConfig).map(([key, config]) => (
                    <button
                        key={key}
                        onClick={() => setActiveRole(key)}
                        className={`px-4 py-2 rounded-sm text-sm font-bold whitespace-nowrap transition-colors ${
                            activeRole === key
                                ? 'bg-action text-action-fg'
                                : 'bg-surface-raised text-text-secondary border border-border hover:bg-surface-sunken'
                        }`}
                    >
                        {config.label}
                    </button>
                ))}
            </div>

            {/* Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredStaff.map((staff) => {
                    const RoleIcon = roleConfig[staff.role].icon;

                    return (
                        <div key={staff.id} className="card-base p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-sm bg-surface-sunken flex items-center justify-center text-lg font-bold text-text-secondary border border-border">
                                        {staff.name[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-text-primary">{staff.name}</h3>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <RoleIcon className="w-3 h-3 text-text-muted" />
                                            <span className="text-xs text-text-muted">{roleConfig[staff.role].label}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-xs font-bold ${
                                    staff.isActive
                                        ? 'bg-success-bg text-success'
                                        : 'bg-surface-sunken text-text-disabled'
                                }`}>
                                    {staff.isActive ? '在职' : '离职'}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-text-secondary">
                                    <Phone className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                                    <span className="font-mono tabular-nums">{staff.phone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-text-secondary">
                                    <Mail className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                                    <span className="truncate">{staff.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-text-secondary">
                                    <Calendar className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                                    <span>入职: {staff.hireDate}</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                                <span className="text-xs text-text-muted">{shiftLabels[staff.shift]}</span>
                                <span className="text-sm font-bold font-mono tabular-nums text-text-primary">
                                    ¥{staff.hourlyRate}/h
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
