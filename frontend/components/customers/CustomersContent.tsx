'use client';

import { useState } from 'react';
import {
    Search,
    UserPlus,
    Star,
    Phone,
    Mail,
    Calendar,
    ShoppingBag,
    DollarSign,
    Gift,
    Edit,
    Save,
    X,
    ChefHat,
    MessageSquare,
    Send
} from 'lucide-react';

// 口味偏好配置
const tasteLabels = {
    salt: ['极淡', '偏淡', '正常', '偏咸', '重咸'],
    spice: ['不辣', '微辣', '中辣', '辣', '特辣'],
    oil: ['少油', '偏少', '正常', '偏多', '多油'],
    sweetness: ['不甜', '微甜', '正常', '偏甜', '很甜'],
};

// 顾客口味档案接口
interface TasteProfile {
    salt_level: number;
    spice_level: number;
    oil_level: number;
    sweetness: number;
    morePortionRequests: string[]; // 喜欢多加的食材
    lessPortionRequests: string[]; // 喜欢少放的食材
    allergies: string[];
    notes: string;
}

// 顾客评价历史
interface FeedbackRecord {
    orderId: string;
    dish: string;
    feedback: string;
    rating: number;
    date: string;
}

// 顾客数据接口
interface Customer {
    id: string;
    name: string;
    phone: string;
    email: string;
    totalOrders: number;
    totalSpent: number;
    lastVisit: string;
    tags: string[];
    isMember: boolean;
    tasteProfile?: TasteProfile;
    feedbackHistory?: FeedbackRecord[];
}

// Mock 顾客数据 - 带口味档案
const mockCustomers: Customer[] = [
    {
        id: 'C001',
        name: '张先生',
        phone: '138****1234',
        email: 'zhang@email.com',
        totalOrders: 28,
        totalSpent: 856,
        lastVisit: '今天',
        tags: ['VIP', '常客'],
        isMember: true,
        tasteProfile: {
            salt_level: 3,
            spice_level: 4, // 喜欢辣
            oil_level: 2,   // 少油
            sweetness: 3,
            morePortionRequests: ['葱花', '蒜'],
            lessPortionRequests: ['香菜'],
            allergies: ['花生'],
            notes: '不吃香菜，对花生过敏'
        },
        feedbackHistory: [
            { orderId: '#1020', dish: '宫保鸡丁', feedback: '辣度刚好，下次可以少放油', rating: 5, date: '2026-01-27' },
            { orderId: '#1018', dish: '麻婆豆腐', feedback: '完美！', rating: 5, date: '2026-01-25' },
        ]
    },
    {
        id: 'C002',
        name: 'Mike Johnson',
        phone: '555-5678',
        email: 'mike@email.com',
        totalOrders: 15,
        totalSpent: 423,
        lastVisit: '昨天',
        tags: ['外卖'],
        isMember: true,
        tasteProfile: {
            salt_level: 2,
            spice_level: 1, // 不能吃辣
            oil_level: 3,
            sweetness: 4,   // 喜甜
            morePortionRequests: [],
            lessPortionRequests: ['辣椒'],
            allergies: [],
            notes: '完全不吃辣'
        },
        feedbackHistory: [
            { orderId: '#1019', dish: '糖醋排骨', feedback: '甜度perfect!', rating: 5, date: '2026-01-26' },
        ]
    },
    {
        id: 'C003',
        name: '李女士',
        phone: '136****9012',
        email: 'li@email.com',
        totalOrders: 32,
        totalSpent: 1120,
        lastVisit: '3天前',
        tags: ['VIP', '生日客户'],
        isMember: true,
        tasteProfile: {
            salt_level: 4,
            spice_level: 3,
            oil_level: 3,
            sweetness: 2,
            morePortionRequests: ['肉'],
            lessPortionRequests: [],
            allergies: ['海鲜'],
            notes: '海鲜过敏，喜欢肉多'
        },
        feedbackHistory: []
    },
    {
        id: 'C004',
        name: 'Sarah Lee',
        phone: '555-3456',
        email: 'sarah@email.com',
        totalOrders: 5,
        totalSpent: 142,
        lastVisit: '1周前',
        tags: [],
        isMember: false
    },
    {
        id: 'C005',
        name: '王经理',
        phone: '135****7890',
        email: 'wang@email.com',
        totalOrders: 45,
        totalSpent: 2350,
        lastVisit: '昨天',
        tags: ['VIP', '企业客户'],
        isMember: true,
        tasteProfile: {
            salt_level: 3,
            spice_level: 2,
            oil_level: 2,
            sweetness: 3,
            morePortionRequests: [],
            lessPortionRequests: [],
            allergies: [],
            notes: '口味清淡，少油'
        },
        feedbackHistory: [
            { orderId: '#1022', dish: '清炒时蔬', feedback: '很健康，继续保持', rating: 5, date: '2026-01-27' },
        ]
    },
];

export function CustomersContent() {
    const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTag, setFilterTag] = useState<string>('all');
    const [isEditingTaste, setIsEditingTaste] = useState(false);
    const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);

    const allTags = ['VIP', '常客', '外卖', '生日客户', '企业客户'];

    const filteredCustomers = customers.filter((c) => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone.includes(searchQuery) || c.email.includes(searchQuery);
        const matchesTag = filterTag === 'all' || c.tags.includes(filterTag);
        return matchesSearch && matchesTag;
    });

    const stats = {
        total: customers.length,
        members: customers.filter((c) => c.isMember).length,
        vip: customers.filter((c) => c.tags.includes('VIP')).length,
        withTasteProfile: customers.filter((c) => c.tasteProfile).length,
    };

    const sendFeedbackRequest = (customer: Customer) => {
        // 模拟发送反馈请求短信
        alert(`已发送反馈邀请短信至 ${customer.phone}`);
    };

    return (
        <div className="min-h-screen bg-bg-secondary">
            {/* 头部 */}
            <header className="bg-white px-8 py-6 border-b border-border-light shadow-sm flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">顾客管理</h1>
                    <p className="text-sm text-text-muted mt-1">
                        共 <span className="text-primary font-semibold">{stats.total}</span> 位顾客，
                        <span className="text-success font-semibold">{stats.withTasteProfile}</span> 位有口味档案
                    </p>
                </div>
                <button className="btn btn-primary flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> 添加顾客
                </button>
            </header>

            <div className="p-8">
                {/* 统计卡片 */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <StatCard icon="👥" value={stats.total} label="总顾客数" />
                    <StatCard icon="⭐" value={stats.members} label="会员数" />
                    <StatCard icon="👑" value={stats.vip} label="VIP 客户" />
                    <StatCard icon="🎛️" value={stats.withTasteProfile} label="口味档案" color="text-primary" />
                </div>

                {/* 搜索和筛选 */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <input
                            type="text"
                            placeholder="搜索顾客姓名、电话、邮箱..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="form-input pl-10"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFilterTag('all')}
                            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${filterTag === 'all' ? 'bg-primary text-white' : 'bg-white text-text-secondary border border-border'
                                }`}
                        >
                            全部
                        </button>
                        {allTags.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setFilterTag(tag)}
                                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${filterTag === tag ? 'bg-primary text-white' : 'bg-white text-text-secondary border border-border'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 顾客列表 */}
                    <div className="lg:col-span-1 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
                        {filteredCustomers.map((customer) => (
                            <button
                                key={customer.id}
                                onClick={() => { setSelectedCustomer(customer); setIsEditingTaste(false); }}
                                className={`w-full card p-4 text-left flex items-center gap-4 transition-all ${selectedCustomer?.id === customer.id ? 'ring-2 ring-primary' : ''
                                    }`}
                            >
                                {/* 头像 */}
                                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-xl relative">
                                    {customer.isMember ? '⭐' : '👤'}
                                    {customer.tasteProfile && (
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                            <ChefHat className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* 信息 */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-text-primary truncate">{customer.name}</span>
                                        {customer.tags.slice(0, 2).map((tag) => (
                                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="text-sm text-text-muted truncate">{customer.phone}</div>
                                </div>

                                {/* 统计 */}
                                <div className="text-right flex-shrink-0">
                                    <div className="font-bold text-primary">${customer.totalSpent}</div>
                                    <div className="text-xs text-text-muted">{customer.totalOrders} 单</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* 顾客详情 - 含口味档案 */}
                    <div className="lg:col-span-2 card">
                        {selectedCustomer ? (
                            <div className="p-6">
                                {/* 顾客头部信息 */}
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-3xl">
                                            {selectedCustomer.isMember ? '⭐' : '👤'}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-text-primary">{selectedCustomer.name}</h3>
                                            <div className="flex items-center gap-4 text-sm text-text-muted mt-1">
                                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedCustomer.phone}</span>
                                                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {selectedCustomer.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                {selectedCustomer.tags.map((tag) => (
                                                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => sendFeedbackRequest(selectedCustomer)}
                                        className="btn btn-secondary flex items-center gap-2"
                                    >
                                        <Send className="w-4 h-4" /> 发送评价邀请
                                    </button>
                                </div>

                                {/* 消费统计 */}
                                <div className="grid grid-cols-4 gap-4 mb-6">
                                    <div className="p-4 bg-primary-100 rounded-xl text-center">
                                        <ShoppingBag className="w-5 h-5 mx-auto text-primary mb-1" />
                                        <div className="text-xl font-bold text-primary">{selectedCustomer.totalOrders}</div>
                                        <div className="text-xs text-text-muted">订单数</div>
                                    </div>
                                    <div className="p-4 bg-green-50 rounded-xl text-center">
                                        <DollarSign className="w-5 h-5 mx-auto text-green-600 mb-1" />
                                        <div className="text-xl font-bold text-green-600">${selectedCustomer.totalSpent}</div>
                                        <div className="text-xs text-text-muted">总消费</div>
                                    </div>
                                    <div className="p-4 bg-orange-50 rounded-xl text-center">
                                        <Calendar className="w-5 h-5 mx-auto text-orange-600 mb-1" />
                                        <div className="text-xl font-bold text-orange-600">{selectedCustomer.lastVisit}</div>
                                        <div className="text-xs text-text-muted">上次消费</div>
                                    </div>
                                    <div className="p-4 bg-purple-50 rounded-xl text-center">
                                        <Gift className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                                        <div className="text-xl font-bold text-purple-600">{selectedCustomer.isMember ? '已开通' : '未开通'}</div>
                                        <div className="text-xs text-text-muted">会员状态</div>
                                    </div>
                                </div>

                                {/* 口味档案 - 核心功能 */}
                                <div className="card p-4 mb-6 border-2 border-primary/20 bg-blue-50/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <ChefHat className="w-5 h-5 text-primary" />
                                            <h4 className="font-bold text-text-primary">口味档案</h4>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                自动同步至炒菜机器人
                                            </span>
                                        </div>
                                        {selectedCustomer.tasteProfile && !isEditingTaste && (
                                            <button
                                                onClick={() => setIsEditingTaste(true)}
                                                className="btn btn-ghost btn-sm flex items-center gap-1"
                                            >
                                                <Edit className="w-3 h-3" /> 编辑
                                            </button>
                                        )}
                                        {isEditingTaste && (
                                            <div className="flex gap-2">
                                                <button onClick={() => setIsEditingTaste(false)} className="btn btn-ghost btn-sm">
                                                    <X className="w-3 h-3" /> 取消
                                                </button>
                                                <button onClick={() => setIsEditingTaste(false)} className="btn btn-primary btn-sm">
                                                    <Save className="w-3 h-3" /> 保存
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {selectedCustomer.tasteProfile ? (
                                        <div className="space-y-4">
                                            {/* 口味滑块 */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <TasteDisplay
                                                    label="咸度" icon="🧂"
                                                    value={selectedCustomer.tasteProfile.salt_level}
                                                    labels={tasteLabels.salt}
                                                    editing={isEditingTaste}
                                                />
                                                <TasteDisplay
                                                    label="辣度" icon="🌶️"
                                                    value={selectedCustomer.tasteProfile.spice_level}
                                                    labels={tasteLabels.spice}
                                                    color="#ef4444"
                                                    editing={isEditingTaste}
                                                />
                                                <TasteDisplay
                                                    label="油量" icon="🫒"
                                                    value={selectedCustomer.tasteProfile.oil_level}
                                                    labels={tasteLabels.oil}
                                                    color="#eab308"
                                                    editing={isEditingTaste}
                                                />
                                                <TasteDisplay
                                                    label="甜度" icon="🍯"
                                                    value={selectedCustomer.tasteProfile.sweetness}
                                                    labels={tasteLabels.sweetness}
                                                    color="#f97316"
                                                    editing={isEditingTaste}
                                                />
                                            </div>

                                            {/* 特殊请求 */}
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                                                <div>
                                                    <div className="text-xs text-text-muted mb-2">喜欢多加</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {selectedCustomer.tasteProfile.morePortionRequests.length > 0 ?
                                                            selectedCustomer.tasteProfile.morePortionRequests.map((item) => (
                                                                <span key={item} className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                                                                    + {item}
                                                                </span>
                                                            )) : <span className="text-xs text-text-muted">无</span>
                                                        }
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-text-muted mb-2">喜欢少放</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {selectedCustomer.tasteProfile.lessPortionRequests.length > 0 ?
                                                            selectedCustomer.tasteProfile.lessPortionRequests.map((item) => (
                                                                <span key={item} className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                                                                    - {item}
                                                                </span>
                                                            )) : <span className="text-xs text-text-muted">无</span>
                                                        }
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 过敏和备注 */}
                                            {(selectedCustomer.tasteProfile.allergies.length > 0 || selectedCustomer.tasteProfile.notes) && (
                                                <div className="pt-4 border-t border-border">
                                                    {selectedCustomer.tasteProfile.allergies.length > 0 && (
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-xs font-medium text-red-600">⚠️ 过敏：</span>
                                                            {selectedCustomer.tasteProfile.allergies.map((allergy) => (
                                                                <span key={allergy} className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                                                                    {allergy}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {selectedCustomer.tasteProfile.notes && (
                                                        <div className="text-sm text-text-secondary bg-white rounded-lg p-2">
                                                            💬 {selectedCustomer.tasteProfile.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-text-muted">
                                            <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                            <p>该顾客暂无口味档案</p>
                                            <p className="text-xs mt-1">用餐后发送评价短信，收集口味偏好</p>
                                            <button
                                                onClick={() => sendFeedbackRequest(selectedCustomer)}
                                                className="btn btn-primary btn-sm mt-3"
                                            >
                                                <Send className="w-3 h-3 mr-1" /> 发送评价邀请
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* 评价历史 */}
                                {selectedCustomer.feedbackHistory && selectedCustomer.feedbackHistory.length > 0 && (
                                    <div className="card p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <MessageSquare className="w-4 h-4 text-text-muted" />
                                            <h4 className="font-medium text-text-primary">历史评价</h4>
                                        </div>
                                        <div className="space-y-2">
                                            {selectedCustomer.feedbackHistory.map((feedback, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className="font-medium text-text-primary">{feedback.dish}</div>
                                                        <div className="flex">
                                                            {[...Array(feedback.rating)].map((_, i) => (
                                                                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                            ))}
                                                        </div>
                                                        <span className="text-sm text-text-muted">"{feedback.feedback}"</span>
                                                    </div>
                                                    <span className="text-xs text-text-muted">{feedback.date}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-text-muted">
                                <div className="text-5xl mb-3">👥</div>
                                <p className="text-lg">选择顾客查看详情和口味档案</p>
                                <p className="text-sm mt-2">口味档案将自动同步至厨房 KDS 和炒菜机器人</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, value, label, color = 'text-text-primary' }: { icon: string; value: string | number; label: string; color?: string }) {
    return (
        <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center text-lg">{icon}</div>
            <div>
                <div className={`text-xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-text-muted">{label}</div>
            </div>
        </div>
    );
}

function TasteDisplay({ label, icon, value, labels, color = '#6b7280', editing }: {
    label: string;
    icon: string;
    value: number;
    labels: string[];
    color?: string;
    editing?: boolean;
}) {
    return (
        <div className="flex items-center gap-3 p-2 bg-white rounded-lg">
            <span className="text-lg">{icon}</span>
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">{label}</span>
                    <span className="text-sm font-medium" style={{ color }}>{labels[value - 1]}</span>
                </div>
                <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                        <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${level <= value ? '' : 'bg-gray-200'
                                }`}
                            style={{ backgroundColor: level <= value ? color : undefined }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
