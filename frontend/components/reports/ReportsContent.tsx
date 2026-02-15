'use client';

import { useState } from 'react';
import {
    BarChart3,
    TrendingUp,
    DollarSign,
    CreditCard,
    Calendar,
    Download,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    Users,
    ShoppingBag
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    BarElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

// Mock Data
const incomeData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
        {
            label: '本周收入',
            data: [3200, 4500, 4100, 3800, 5200, 6800, 5900],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            tension: 0.4,
        },
    ],
};

const categoryData = {
    labels: ['炒菜', '主食', '饮品', '甜点'],
    datasets: [
        {
            data: [45, 25, 20, 10],
            backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(239, 68, 68, 0.8)',
            ],
            borderWidth: 0,
        },
    ],
};

const stats = [
    { label: '总营收', value: '$33,500', change: '+12.5%', icon: DollarSign, trend: 'up' },
    { label: '总订单', value: '1,245', change: '+8.2%', icon: ShoppingBag, trend: 'up' },
    { label: '平均客单', value: '$26.90', change: '-2.1%', icon: CreditCard, trend: 'down' },
    { label: '新顾客', value: '320', change: '+15.3%', icon: Users, trend: 'up' },
];

export function ReportsContent() {
    const [period, setPeriod] = useState('week');

    return (
        <div className="min-h-screen bg-bg-secondary p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-primary" /> 报表分析
                    </h1>
                    <p className="text-sm text-text-muted mt-1">
                        实时监控餐厅经营状况，数据驱动决策
                    </p>
                </div>

                <div className="flex gap-3">
                    <div className="bg-white rounded-xl p-1 shadow-sm border border-border/50 flex">
                        {['day', 'week', 'month', 'year'].map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p
                                        ? 'bg-black text-white shadow'
                                        : 'text-text-secondary hover:bg-gray-100'
                                    }`}
                            >
                                {p === 'day' ? '今日' : p === 'week' ? '本周' : p === 'month' ? '本月' : '全年'}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn-secondary shadow-sm">
                        <Download className="w-4 h-4 mr-1" /> 导出报表
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    const isUp = stat.trend === 'up';
                    return (
                        <div key={i} className="card p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isUp ? 'bg-primary/10 text-primary' : 'bg-orange-50 text-orange-500'}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                    }`}>
                                    {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {stat.change}
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-text-primary">{stat.value}</div>
                                <div className="text-sm text-text-muted mt-1">{stat.label}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart */}
                <div className="lg:col-span-2 card p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" /> 营收趋势
                        </h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <Line
                            data={incomeData}
                            options={{
                                maintainAspectRatio: false,
                                responsive: true,
                                scales: {
                                    y: { grid: { color: '#f3f4f6' }, border: { display: false } },
                                    x: { grid: { display: false }, border: { display: false } },
                                },
                                plugins: {
                                    legend: { display: false }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="card p-6">
                    <h3 className="font-bold text-lg text-text-primary flex items-center gap-2 mb-6">
                        <PieChart className="w-5 h-5 text-primary" /> 品类占比
                    </h3>
                    <div className="h-[300px] flex items-center justify-center">
                        <Doughnut
                            data={categoryData}
                            options={{
                                maintainAspectRatio: false,
                                cutout: '70%',
                                plugins: {
                                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
