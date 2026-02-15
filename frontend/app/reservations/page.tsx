'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Phone, Mail, Plus, Search, Filter, CheckCircle, XCircle } from 'lucide-react';

interface Reservation {
    id: string;
    confirmation_number: string;
    guest_name: string;
    guest_phone: string;
    guest_count: number;
    reservation_date: string;
    status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
    special_requests?: string;
    table_id?: string;
}

const statusConfig = {
    pending: { label: '待确认', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    confirmed: { label: '已确认', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    seated: { label: '已入座', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    completed: { label: '已完成', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
    cancelled: { label: '已取消', color: 'bg-red-100 text-red-800', icon: XCircle },
    no_show: { label: '未到店', color: 'bg-orange-100 text-orange-800', icon: XCircle },
};

export default function ReservationsPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReservations();
    }, [selectedDate]);

    const loadReservations = async () => {
        try {
            // 模拟数据
            const mockData: Reservation[] = [
                {
                    id: '1',
                    confirmation_number: 'RES12345',
                    guest_name: '张先生',
                    guest_phone: '13800138000',
                    guest_count: 4,
                    reservation_date: `${selectedDate}T18:00:00`,
                    status: 'confirmed',
                    special_requests: '靠窗座位'
                },
                {
                    id: '2',
                    confirmation_number: 'RES12346',
                    guest_name: 'Mike Johnson',
                    guest_phone: '13900139000',
                    guest_count: 2,
                    reservation_date: `${selectedDate}T19:00:00`,
                    status: 'pending'
                },
            ];
            setReservations(mockData);
        } catch (error) {
            console.error('加载预订失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await fetch(`/api/v1/reservations/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            loadReservations();
        } catch (error) {
            console.error('更新状态失败:', error);
        }
    };

    const stats = {
        total: reservations.length,
        confirmed: reservations.filter(r => r.status === 'confirmed').length,
        pending: reservations.filter(r => r.status === 'pending').length,
        seated: reservations.filter(r => r.status === 'seated').length,
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* 头部 */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">预订管理</h1>
                    <p className="text-gray-600 mt-1">今日预订 {stats.total} 个，已确认 {stats.confirmed} 个</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center shadow-lg"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    新建预订
                </button>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <StatCard label="总预订" value={stats.total} color="bg-blue-100 text-blue-800" />
                <StatCard label="待确认" value={stats.pending} color="bg-yellow-100 text-yellow-800" />
                <StatCard label="已确认" value={stats.confirmed} color="bg-green-100 text-green-800" />
                <StatCard label="已入座" value={stats.seated} color="bg-purple-100 text-purple-800" />
            </div>

            {/* 日期选择 */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="flex items-center space-x-4">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center">
                        <Filter className="w-4 h-4 mr-2" />
                        筛选
                    </button>
                    <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center">
                        <Search className="w-4 h-4 mr-2" />
                        搜索
                    </button>
                </div>
            </div>

            {/* 预订列表 */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">确认号</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">客人姓名</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">联系电话</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">人数</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {reservations.map((reservation) => {
                            const status = statusConfig[reservation.status];
                            const StatusIcon = status.icon;
                            return (
                                <tr key={reservation.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-sm font-semibold text-blue-600">
                                            {reservation.confirmation_number}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{reservation.guest_name}</div>
                                        {reservation.special_requests && (
                                            <div className="text-xs text-gray-500">{reservation.special_requests}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{reservation.guest_phone}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center text-sm text-gray-900">
                                            <Users className="w-4 h-4 mr-1 text-gray-400" />
                                            {reservation.guest_count}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center text-sm text-gray-900">
                                            <Clock className="w-4 h-4 mr-1 text-gray-400" />
                                            {new Date(reservation.reservation_date).toLocaleTimeString('zh-CN', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                            <StatusIcon className="w-3 h-3 mr-1" />
                                            {status.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex space-x-2">
                                            {reservation.status === 'pending' && (
                                                <button
                                                    onClick={() => updateStatus(reservation.id, 'confirmed')}
                                                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                                                >
                                                    确认
                                                </button>
                                            )}
                                            {reservation.status === 'confirmed' && (
                                                <button
                                                    onClick={() => updateStatus(reservation.id, 'seated')}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                >
                                                    入座
                                                </button>
                                            )}
                                            <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                                                取消
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* 新建预订弹窗 */}
            {showAddModal && (
                <AddReservationModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        loadReservations();
                    }}
                />
            )}
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">{label}</div>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
        </div>
    );
}

function AddReservationModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        guest_name: '',
        guest_phone: '',
        guest_count: 2,
        date: new Date().toISOString().split('T')[0],
        time: '18:00',
        special_requests: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // 这里应该调用API创建预订
            console.log('创建预订:', formData);
            onSuccess();
        } catch (error) {
            console.error('创建失败:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">新建预订</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">客人姓名</label>
                        <input
                            type="text"
                            required
                            value={formData.guest_name}
                            onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                        <input
                            type="tel"
                            required
                            value={formData.guest_phone}
                            onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">预订日期</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">时间</label>
                            <input
                                type="time"
                                required
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">就餐人数</label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={formData.guest_count}
                            onChange={(e) => setFormData({ ...formData, guest_count: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">特殊要求</label>
                        <textarea
                            value={formData.special_requests}
                            onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                        />
                    </div>
                    
                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
                        >
                            创建预订
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
