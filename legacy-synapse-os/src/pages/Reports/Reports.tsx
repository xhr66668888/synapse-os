import React, { useState } from 'react';
import './Reports.css';

// 模拟销售数据
const salesData = {
    today: { revenue: 3842, orders: 128, avgOrder: 30.02, comparison: '+12%' },
    week: { revenue: 24560, orders: 856, avgOrder: 28.69, comparison: '+8%' },
    month: { revenue: 98420, orders: 3245, avgOrder: 30.33, comparison: '+15%' },
};

// 热门菜品
const topItems = [
    { rank: 1, name: '宫保鸡丁', sales: 245, revenue: 3430, trend: 'up' },
    { rank: 2, name: '麻婆豆腐', sales: 198, revenue: 2376, trend: 'up' },
    { rank: 3, name: '左宗棠鸡', sales: 176, revenue: 2816, trend: 'stable' },
    { rank: 4, name: '芝麻鸡', sales: 165, revenue: 2310, trend: 'down' },
    { rank: 5, name: '蒙古牛肉', sales: 142, revenue: 2414, trend: 'up' },
];

// 时段分析
const hourlyData = [
    { hour: '11:00', orders: 15 },
    { hour: '12:00', orders: 48 },
    { hour: '13:00', orders: 32 },
    { hour: '14:00', orders: 12 },
    { hour: '17:00', orders: 28 },
    { hour: '18:00', orders: 56 },
    { hour: '19:00', orders: 62 },
    { hour: '20:00', orders: 45 },
    { hour: '21:00', orders: 18 },
];

// 支付方式
const paymentMethods = [
    { method: '信用卡', amount: 2150, percentage: 56 },
    { method: '现金', amount: 842, percentage: 22 },
    { method: 'Apple Pay', amount: 580, percentage: 15 },
    { method: '其他', amount: 270, percentage: 7 },
];

type TimeRange = 'today' | 'week' | 'month';

export const Reports: React.FC = () => {
    const [timeRange, setTimeRange] = useState<TimeRange>('today');
    const currentData = salesData[timeRange];
    const maxOrders = Math.max(...hourlyData.map(h => h.orders));

    return (
        <div className="reports-page page">
            <header className="page-header">
                <div className="container flex-between">
                    <div>
                        <h1 className="page-title">报表分析</h1>
                        <p className="page-subtitle">销售数据与业务洞察</p>
                    </div>
                    <div className="time-range-selector">
                        <button
                            className={`range-btn ${timeRange === 'today' ? 'active' : ''}`}
                            onClick={() => setTimeRange('today')}
                        >今日</button>
                        <button
                            className={`range-btn ${timeRange === 'week' ? 'active' : ''}`}
                            onClick={() => setTimeRange('week')}
                        >本周</button>
                        <button
                            className={`range-btn ${timeRange === 'month' ? 'active' : ''}`}
                            onClick={() => setTimeRange('month')}
                        >本月</button>
                    </div>
                </div>
            </header>

            <div className="page-content">
                <div className="container">
                    {/* 核心指标 */}
                    <div className="metrics-grid">
                        <div className="metric-card card">
                            <div className="metric-icon revenue">
                                <img src="/assets/icon-pos-new.png" alt="" style={{ width: 24, filter: 'brightness(0) invert(1)' }} />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">${currentData.revenue.toLocaleString()}</div>
                                <div className="metric-label">营业额</div>
                            </div>
                            <span className="metric-trend positive">{currentData.comparison}</span>
                        </div>
                        <div className="metric-card card">
                            <div className="metric-icon orders">
                                <img src="/assets/icon-orders-new.png" alt="" style={{ width: 24, filter: 'brightness(0) invert(1)' }} />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">{currentData.orders}</div>
                                <div className="metric-label">订单数</div>
                            </div>
                            <span className="metric-trend positive">+8%</span>
                        </div>
                        <div className="metric-card card">
                            <div className="metric-icon avg">
                                <img src="/assets/icon-menu-new.png" alt="" style={{ width: 24, filter: 'brightness(0) invert(1)' }} />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">${currentData.avgOrder}</div>
                                <div className="metric-label">客单价</div>
                            </div>
                            <span className="metric-trend positive">+3%</span>
                        </div>
                        <div className="metric-card card">
                            <div className="metric-icon customers">
                                <img src="/assets/icon-profile-new.png" alt="" style={{ width: 24, filter: 'brightness(0) invert(1)' }} />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">115</div>
                                <div className="metric-label">新顾客</div>
                            </div>
                            <span className="metric-trend positive">+15%</span>
                        </div>
                    </div>

                    <div className="reports-grid">
                        {/* 热门菜品 */}
                        <div className="card top-items-card">
                            <div className="card-header">
                                <h3>热门菜品</h3>
                                <span className="text-muted">按销量排序</span>
                            </div>
                            <div className="top-items-list">
                                {topItems.map(item => (
                                    <div key={item.rank} className="top-item-row">
                                        <span className={`rank rank-${item.rank}`}>{item.rank}</span>
                                        <span className="item-name">{item.name}</span>
                                        <span className="item-sales">{item.sales} 份</span>
                                        <span className="item-revenue">${item.revenue}</span>
                                        <span className={`trend-icon ${item.trend}`}>
                                            {item.trend === 'up' && '↑'}
                                            {item.trend === 'down' && '↓'}
                                            {item.trend === 'stable' && '→'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 时段分析 */}
                        <div className="card hourly-card">
                            <div className="card-header">
                                <h3>时段分析</h3>
                                <span className="text-muted">订单量分布</span>
                            </div>
                            <div className="hourly-chart">
                                {hourlyData.map(h => (
                                    <div key={h.hour} className="hour-bar-group">
                                        <div
                                            className="hour-bar"
                                            style={{ height: `${(h.orders / maxOrders) * 100}%` }}
                                        >
                                            <span className="hour-value">{h.orders}</span>
                                        </div>
                                        <span className="hour-label">{h.hour}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 支付方式 */}
                        <div className="card payment-card">
                            <div className="card-header">
                                <h3>支付方式</h3>
                                <span className="text-muted">今日分布</span>
                            </div>
                            <div className="payment-list">
                                {paymentMethods.map(p => (
                                    <div key={p.method} className="payment-row">
                                        <span className="payment-method">{p.method}</span>
                                        <div className="payment-bar-track">
                                            <div
                                                className="payment-bar-fill"
                                                style={{ width: `${p.percentage}%` }}
                                            />
                                        </div>
                                        <span className="payment-amount">${p.amount}</span>
                                        <span className="payment-percent">{p.percentage}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
