'use client';

import { useState } from 'react';
import { Star, MessageCircle, Send, Sparkles, TrendingUp, ThumbsUp, Filter, Calendar } from 'lucide-react';

interface Review {
    id: string;
    customer_name: string;
    rating: number;
    content: string;
    platform: string;
    created_at: string;
    status: 'pending' | 'approved' | 'responded';
    response?: string;
    order_number?: string;
}

const mockReviews: Review[] = [
    {
        id: '1',
        customer_name: '张先生',
        rating: 5,
        content: '菜品非常美味，服务态度很好，环境也很舒适。会再来的！',
        platform: 'dianping',
        created_at: '2024-01-20 18:30',
        status: 'pending',
        order_number: '#1234'
    },
    {
        id: '2',
        customer_name: 'Mike',
        rating: 4,
        content: 'Great food and service. The atmosphere was nice. Would recommend!',
        platform: 'google',
        created_at: '2024-01-20 17:15',
        status: 'approved',
        response: '感谢您的好评！期待您的下次光临。'
    },
    {
        id: '3',
        customer_name: '李女士',
        rating: 3,
        content: '菜品还可以，但是上菜速度有点慢，希望改进。',
        platform: 'meituan',
        created_at: '2024-01-20 16:00',
        status: 'responded',
        response: '非常感谢您的宝贵意见！我们会加强厨房效率，为您提供更好的服务。'
    },
];

const platformNames: Record<string, string> = {
    dianping: '大众点评',
    google: 'Google',
    meituan: '美团',
    yelp: 'Yelp',
    internal: '内部系统'
};

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>(mockReviews);
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);
    const [replyText, setReplyText] = useState('');
    const [showAutoReply, setShowAutoReply] = useState(false);

    const stats = {
        total: reviews.length,
        pending: reviews.filter(r => r.status === 'pending').length,
        avgRating: (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
        responseRate: ((reviews.filter(r => r.status === 'responded').length / reviews.length) * 100).toFixed(0)
    };

    const generateAutoReply = (review: Review) => {
        if (review.rating >= 4) {
            return `亲爱的${review.customer_name}，非常感谢您的5星好评！您的满意是我们最大的动力。期待您的下次光临！🌟`;
        } else if (review.rating === 3) {
            return `感谢${review.customer_name}的反馈。我们会持续改进服务质量，希望下次能给您带来更好的体验。`;
        } else {
            return `非常抱歉没能让您满意。我们会认真对待您的意见，并立即改进。如有任何问题，请随时联系我们的客服。`;
        }
    };

    const handleAutoReply = (review: Review) => {
        const autoReply = generateAutoReply(review);
        setSelectedReview(review);
        setReplyText(autoReply);
        setShowAutoReply(true);
    };

    const submitReply = () => {
        if (selectedReview) {
            setReviews(reviews.map(r => 
                r.id === selectedReview.id 
                    ? { ...r, status: 'responded' as const, response: replyText }
                    : r
            ));
            setSelectedReview(null);
            setReplyText('');
            setShowAutoReply(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* 头部 */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">评价管理</h1>
                    <p className="text-gray-600 mt-1">监控和管理客户评价，提升品牌形象</p>
                </div>
                <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold flex items-center shadow-lg">
                    <Sparkles className="w-5 h-5 mr-2" />
                    发起好评活动
                </button>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <StatCard
                    icon={MessageCircle}
                    label="总评价数"
                    value={stats.total}
                    color="bg-blue-500"
                />
                <StatCard
                    icon={Star}
                    label="平均评分"
                    value={stats.avgRating}
                    color="bg-yellow-500"
                    suffix="⭐"
                />
                <StatCard
                    icon={ThumbsUp}
                    label="回复率"
                    value={`${stats.responseRate}%`}
                    color="bg-green-500"
                />
                <StatCard
                    icon={TrendingUp}
                    label="待处理"
                    value={stats.pending}
                    color="bg-orange-500"
                />
            </div>

            {/* 筛选栏 */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex items-center space-x-4">
                <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center">
                    <Filter className="w-4 h-4 mr-2" />
                    筛选平台
                </button>
                <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center">
                    <Star className="w-4 h-4 mr-2" />
                    评分筛选
                </button>
                <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    日期范围
                </button>
            </div>

            {/* 评价列表 */}
            <div className="space-y-4">
                {reviews.map((review) => (
                    <div key={review.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-start space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                    {review.customer_name[0]}
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2 mb-1">
                                        <h3 className="text-lg font-bold text-gray-900">{review.customer_name}</h3>
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                            {platformNames[review.platform] || review.platform}
                                        </span>
                                        {review.order_number && (
                                            <span className="text-sm text-gray-500">订单: {review.order_number}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`w-5 h-5 ${
                                                        i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-sm text-gray-500">{review.created_at}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                {review.status === 'pending' && (
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                                        待处理
                                    </span>
                                )}
                                {review.status === 'approved' && (
                                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                                        已通过
                                    </span>
                                )}
                                {review.status === 'responded' && (
                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                        已回复
                                    </span>
                                )}
                            </div>
                        </div>

                        <p className="text-gray-700 mb-4 leading-relaxed">{review.content}</p>

                        {review.response && (
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-4">
                                <div className="flex items-start">
                                    <MessageCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                                    <div>
                                        <div className="text-sm font-medium text-blue-900 mb-1">商家回复</div>
                                        <p className="text-blue-800">{review.response}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {review.status === 'pending' && (
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => handleAutoReply(review)}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold flex items-center justify-center"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    AI智能回复
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedReview(review);
                                        setReplyText('');
                                        setShowAutoReply(true);
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold flex items-center justify-center"
                                >
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    手动回复
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* 回复弹窗 */}
            {showAutoReply && selectedReview && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">回复评价</h2>
                        
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <div className="flex items-center space-x-2 mb-2">
                                <span className="font-semibold">{selectedReview.customer_name}</span>
                                <div className="flex">
                                    {[...Array(selectedReview.rating)].map((_, i) => (
                                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    ))}
                                </div>
                            </div>
                            <p className="text-gray-700">{selectedReview.content}</p>
                        </div>

                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full h-32 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
                            placeholder="输入您的回复..."
                        />

                        <div className="flex space-x-3">
                            <button
                                onClick={() => {
                                    setShowAutoReply(false);
                                    setSelectedReview(null);
                                    setReplyText('');
                                }}
                                className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50"
                            >
                                取消
                            </button>
                            <button
                                onClick={submitReply}
                                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center"
                            >
                                <Send className="w-5 h-5 mr-2" />
                                发送回复
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, suffix }: any) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="text-sm text-gray-600 mb-1">{label}</div>
            <div className="text-3xl font-bold text-gray-900">
                {value}{suffix || ''}
            </div>
        </div>
    );
}
