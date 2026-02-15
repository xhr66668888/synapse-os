'use client';

import { useState } from 'react';
import {
    Star,
    MessageSquare,
    Send,
    CheckCircle2,
    Clock,
    TrendingUp,
    Users,
    ThumbsUp,
    Settings,
    Zap,
    Gift
} from 'lucide-react';

// Mock data
const recentReviews = [
    { id: 1, customer: '王先生', rating: 5, platform: 'Google', status: 'sent', time: '5分钟前', order: '#1920' },
    { id: 2, customer: '李女士', rating: 5, platform: '美团', status: 'sent', time: '12分钟前', order: '#1918' },
    { id: 3, customer: 'Mike J.', rating: 4, platform: 'Yelp', status: 'pending', time: '20分钟前', order: '#1915' },
    { id: 4, customer: '张三', rating: 5, platform: '大众点评', status: 'sent', time: '35分钟前', order: '#1912' },
];

const templates = [
    {
        id: 1,
        name: '标准感谢',
        content: '感谢您光临{restaurant_name}！希望您用餐愉快，期待您的好评 ⭐',
        usage: 156
    },
    {
        id: 2,
        name: '优惠邀请',
        content: '感谢您的支持！留下好评即可获得下次消费8折优惠券 🎁',
        usage: 89
    },
    {
        id: 3,
        name: '会员专属',
        content: '尊贵的VIP会员，感谢您的信任！您的好评是我们前进的动力 💫',
        usage: 45
    },
];

const stats = {
    totalSent: 1234,
    successRate: 67,
    avgRating: 4.8,
    thisMonth: 156
};

export default function AutoReviewPage() {
    const [autoEnabled, setAutoEnabled] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState(1);
    const [delayMinutes, setDelayMinutes] = useState(30);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
                        <Star className="w-8 h-8 text-yellow-500" />
                        自动好评系统
                    </h1>
                    <p className="text-text-secondary mt-1">智能邀请顾客评价，提升店铺口碑</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-text-secondary">自动发送</span>
                    <button
                        className={`relative w-14 h-7 rounded-full transition-colors ${autoEnabled ? 'bg-primary' : 'bg-gray-300'}`}
                        onClick={() => setAutoEnabled(!autoEnabled)}
                    >
                        <span
                            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${autoEnabled ? 'left-8' : 'left-1'}`}
                        ></span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-6">
                <div className="card p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-blue-50">
                            <Send className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary">{stats.totalSent}</div>
                            <div className="text-sm text-text-muted">总发送量</div>
                        </div>
                    </div>
                </div>
                <div className="card p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-green-50">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary">{stats.successRate}%</div>
                            <div className="text-sm text-text-muted">好评转化率</div>
                        </div>
                    </div>
                </div>
                <div className="card p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-yellow-50">
                            <Star className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary">{stats.avgRating}</div>
                            <div className="text-sm text-text-muted">平均评分</div>
                        </div>
                    </div>
                </div>
                <div className="card p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-purple-50">
                            <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary">{stats.thisMonth}</div>
                            <div className="text-sm text-text-muted">本月发送</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="col-span-2 space-y-6">
                    <div className="card p-6">
                        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
                            <MessageSquare className="w-5 h-5" /> 最近邀评记录
                        </h3>
                        <div className="space-y-3">
                            {recentReviews.map((review) => (
                                <div
                                    key={review.id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-bg-secondary/50 hover:bg-bg-hover transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-100 flex items-center justify-center font-medium text-primary">
                                            {review.customer.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-text-primary">{review.customer}</span>
                                                <span className="text-xs text-text-muted">{review.order}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex">
                                                    {[...Array(review.rating)].map((_, i) => (
                                                        <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                    ))}
                                                </div>
                                                <span className="text-xs text-text-muted">• {review.platform}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-text-muted">{review.time}</span>
                                        {review.status === 'sent' ? (
                                            <span className="badge bg-green-100 text-green-600">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> 已发送
                                            </span>
                                        ) : (
                                            <span className="badge bg-yellow-100 text-yellow-600">
                                                <Clock className="w-3 h-3 mr-1" /> 待发送
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Templates */}
                    <div className="card p-6">
                        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
                            <Zap className="w-5 h-5" /> 邀评模板
                        </h3>
                        <div className="space-y-3">
                            {templates.map((template) => (
                                <div
                                    key={template.id}
                                    className={`p-4 rounded-xl cursor-pointer transition-all ${selectedTemplate === template.id
                                            ? 'bg-primary/10 border-2 border-primary'
                                            : 'bg-bg-secondary/50 border-2 border-transparent hover:bg-bg-hover'
                                        }`}
                                    onClick={() => setSelectedTemplate(template.id)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-text-primary">{template.name}</span>
                                        <span className="text-xs text-text-muted">使用 {template.usage} 次</span>
                                    </div>
                                    <p className="text-sm text-text-secondary">{template.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Settings */}
                <div className="space-y-6">
                    <div className="card p-6">
                        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
                            <Settings className="w-5 h-5" /> 发送设置
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-text-primary">发送延迟</label>
                                <p className="text-xs text-text-muted mb-2">用餐结束后多久发送邀评</p>
                                <select
                                    className="w-full input-field"
                                    value={delayMinutes}
                                    onChange={(e) => setDelayMinutes(Number(e.target.value))}
                                >
                                    <option value={15}>15 分钟</option>
                                    <option value={30}>30 分钟</option>
                                    <option value={60}>1 小时</option>
                                    <option value={120}>2 小时</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-text-primary">目标平台</label>
                                <div className="mt-2 space-y-2">
                                    {['Google', '美团', '大众点评', 'Yelp'].map((platform) => (
                                        <label key={platform} className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" defaultChecked className="rounded text-primary" />
                                            <span className="text-sm text-text-secondary">{platform}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
                            <Gift className="w-5 h-5" /> 好评奖励
                        </h3>
                        <div className="space-y-3">
                            <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
                                <div className="font-medium text-yellow-700">5星好评</div>
                                <div className="text-sm text-yellow-600">送 ¥10 优惠券</div>
                            </div>
                            <div className="p-3 rounded-xl bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200">
                                <div className="font-medium text-gray-700">4星好评</div>
                                <div className="text-sm text-gray-600">送 ¥5 优惠券</div>
                            </div>
                        </div>
                        <button className="w-full mt-4 btn btn-secondary">
                            配置奖励规则
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
