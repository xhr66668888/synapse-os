import React from 'react';
import { useFeatureFlag, useLicenseType } from '../../hooks/useFeatureFlag';
import './Dashboard.css';

// 模拟数据 - 使用中性图标
const stats = [
    { label: '今日订单', value: 128, change: '+12%', icon: '/assets/icon-orders-new.png' },
    { label: '营业额', value: '$3,842', change: '+8%', icon: '/assets/icon-pos-new.png' },
    { label: '平均客单价', value: '$30.02', change: '+3%', icon: '/assets/icon-pos-new.png' },
    { label: '完成订单', value: 115, change: '+15%', icon: '/assets/icon-kds-new.png' },
];

const recentOrders = [
    { id: '#1024', time: '2分钟前', items: '宫保鸡丁 x2, 炒饭 x1', total: '$32.50', status: 'preparing' },
    { id: '#1023', time: '5分钟前', items: '麻婆豆腐 x1, 蒸饺 x2', total: '$28.00', status: 'ready' },
    { id: '#1022', time: '8分钟前', items: '红烧肉 x1, 米饭 x2', total: '$25.80', status: 'completed' },
    { id: '#1021', time: '12分钟前', items: '糖醋排骨 x1', total: '$18.50', status: 'completed' },
];

export const Dashboard: React.FC = () => {
    const hasRobot = useFeatureFlag('robotControl');

    return (
        <div className="dashboard page">
            <div className="page-header">
                <div className="container">
                    <h1 className="page-title">仪表盘</h1>
                    <p className="page-subtitle">欢迎回来，Demo 餐厅</p>
                </div>
            </div>

            <div className="page-content">
                <div className="container">
                    {/* 统计卡片 */}
                    <div className="stats-grid">
                        {stats.map((stat, index) => (
                            <div key={stat.label} className="stat-card card">
                                <div className={`stat-icon ${index % 2 === 0 ? 'blue' : 'green'}`}>
                                    <img src={stat.icon} alt={stat.label} style={{ width: '28px', height: '28px' }} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-value">{stat.value}</div>
                                    <div className="stat-label">{stat.label}</div>
                                </div>
                                <div className={`stat-change ${stat.change.startsWith('+') ? 'positive' : 'negative'}`}>
                                    {stat.change}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Gold 广告已移除 */}

                    <div className="content-grid">
                        {/* 最近订单 */}
                        <div className="orders-card card">
                            <div className="card-header">
                                <h2 className="card-title">最近订单</h2>
                                <a href="/orders" className="text-primary-color">查看全部 →</a>
                            </div>
                            <div className="orders-list">
                                {recentOrders.map((order) => (
                                    <div key={order.id} className="order-item">
                                        <div className="order-info">
                                            <div className="order-id">{order.id}</div>
                                            <div className="order-time">{order.time}</div>
                                        </div>
                                        <div className="order-info" style={{ flex: 2 }}>
                                            <div className="order-items-text">{order.items}</div>
                                        </div>
                                        <div className="order-amount">{order.total}</div>
                                        <span className={`order-status ${order.status}`}>
                                            {order.status === 'preparing' && '制作中'}
                                            {order.status === 'ready' && '已完成'}
                                            {order.status === 'completed' && '已取餐'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="side-column">
                            {/* 机器人状态 (如果启用) - 使用 logo.png */}
                            {hasRobot && (
                                <div className="robot-card card mb-lg">
                                    <div className="card-header">
                                        <h2 className="card-title">PanShaker</h2>
                                        <span className="robot-status-badge online"><span className="dot"></span>在线</span>
                                    </div>
                                    <div className="robot-status">
                                        <img src="/assets/logo.png" alt="PanShaker Robot" className="robot-logo animate-pulse" style={{ width: '100px', height: 'auto', objectFit: 'contain' }} />
                                    </div>
                                    <div className="robot-stats">
                                        <div className="robot-stat">
                                            <div className="robot-stat-value">28</div>
                                            <div className="robot-stat-label">今日炒菜</div>
                                        </div>
                                        <div className="robot-stat">
                                            <div className="robot-stat-value">3</div>
                                            <div className="robot-stat-label">队列中</div>
                                        </div>
                                        <div className="robot-stat">
                                            <div className="robot-stat-value">180°C</div>
                                            <div className="robot-stat-label">油温</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 快捷操作 */}
                            <div className="card">
                                <div className="card-header">
                                    <h2 className="card-title">快捷操作</h2>
                                </div>
                                <div className="quick-actions">
                                    <a href="/pos" className="quick-action-btn">
                                        <img src="/assets/icon-pos-new.png" alt="POS" style={{ width: '36px', height: '36px', margin: '0 auto 8px' }} />
                                        <small>新建订单</small>
                                    </a>
                                    <a href="/kds" className="quick-action-btn">
                                        <img src="/assets/icon-kds-new.png" alt="KDS" style={{ width: '36px', height: '36px', margin: '0 auto 8px' }} />
                                        <small>厨房显示</small>
                                    </a>
                                    <a href="/ai-receptionist" className="quick-action-btn">
                                        <img src="/assets/icon-ai-new.png" alt="AI" style={{ width: '36px', height: '36px', margin: '0 auto 8px' }} />
                                        <small>AI 接线</small>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
