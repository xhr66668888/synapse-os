'use client';

import { useState } from 'react';
import {
    Users,
    Search,
    Filter,
    UserPlus,
    MoreHorizontal,
    Phone,
    Mail,
    Calendar,
    Clock,
    BadgeCheck,
    Shield,
    ChefHat,
    Coffee,
    DollarSign
} from 'lucide-react';

// Mock Sky
interface Staff {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'manager' | 'server' | 'chef' | 'cashier' | 'host';
    avatar?: string;
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

const roleConfig: Record<string, { label: string; icon: any; bg: string; text: string }> = {
    manager: { label: '店长', icon: Shield, bg: 'bg-purple-100', text: 'text-purple-700' },
    chef: { label: '厨师', icon: ChefHat, bg: 'bg-orange-100', text: 'text-orange-700' },
    server: { label: '服务员', icon: Coffee, bg: 'bg-blue-100', text: 'text-blue-700' },
    cashier: { label: '收银员', icon: DollarSign, bg: 'bg-green-100', text: 'text-green-700' },
    host: { label: '接待', icon: Users, bg: 'bg-pink-100', text: 'text-pink-700' },
};

export function StaffContent() {
    const [activeRole, setActiveRole] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredStaff = mockStaff.filter(staff =>
        (activeRole === 'all' || staff.role === activeRole) &&
        (staff.name.toLowerCase().includes(searchQuery.toLowerCase()) || staff.phone.includes(searchQuery))
    );

    return (
        <div className="min-h-screen bg-bg-secondary p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary" /> 员工管理
                    </h1>
                    <p className="text-sm text-text-muted mt-1">
                        在职员工 <span className="text-text-primary font-bold">{mockStaff.filter(s => s.isActive).length}</span> 人
                    </p>
                </div>

                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="搜索员工姓名或电话..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none w-64 shadow-sm"
                        />
                    </div>
                    <button className="btn btn-primary shadow-lg shadow-primary/20">
                        <UserPlus className="w-4 h-4 mr-1" /> 添加员工
                    </button>
                </div>
            </div>

            {/* Role Filter */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
                <button
                    onClick={() => setActiveRole('all')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeRole === 'all' ? 'bg-black text-white' : 'bg-white text-text-secondary hover:bg-gray-100'
                        }`}
                >
                    全部
                </button>
                {Object.entries(roleConfig).map(([key, config]) => (
                    <button
                        key={key}
                        onClick={() => setActiveRole(key)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${activeRole === key
                                ? `${config.bg} ${config.text} ring-1 ring-inset ring-black/5`
                                : 'bg-white text-text-secondary hover:bg-gray-100'
                            }`}
                    >
                        {config.label}
                    </button>
                ))}
            </div>

            {/* Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredStaff.map((staff) => {
                    const RoleIcon = roleConfig[staff.role].icon;

                    return (
                        <div key={staff.id} className="card p-5 hover:shadow-hover transition-all duration-300 group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center text-xl shadow-inner font-bold text-text-secondary">
                                        {staff.name[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-text-primary">{staff.name}</h3>
                                        <div className={`text-xs px-2 py-0.5 rounded-md inline-flex items-center gap-1 mt-1 ${roleConfig[staff.role].bg} ${roleConfig[staff.role].text}`}>
                                            <RoleIcon className="w-3 h-3" />
                                            {roleConfig[staff.role].label}
                                        </div>
                                    </div>
                                </div>
                                <button className="text-text-muted hover:text-text-primary p-1 rounded-md hover:bg-bg-hover">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-3 text-text-secondary">
                                    <Phone className="w-4 h-4 text-text-muted" />
                                    {staff.phone}
                                </div>
                                <div className="flex items-center gap-3 text-text-secondary">
                                    <Mail className="w-4 h-4 text-text-muted" />
                                    {staff.email}
                                </div>
                                <div className="flex items-center gap-3 text-text-secondary">
                                    <Calendar className="w-4 h-4 text-text-muted" />
                                    入职: {staff.hireDate}
                                </div>
                            </div>

                            <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
                                <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${staff.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {staff.isActive ? <BadgeCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                    {staff.isActive ? '在职' : '离职'}
                                </div>
                                <span className="text-sm font-medium text-text-primary">
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
