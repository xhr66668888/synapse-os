import React, { useState } from 'react';
import './Orders.css';

// 订单数据
interface Order {
    id: string;
    orderNumber: string;
    type: 'dine-in' | 'takeout' | 'delivery';
    status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
    customer: string;
    items: { name: string; qty: number; price: number }[];
    total: number;
    time: string;
    table?: number;
    platform?: string;
}

const mockOrders: Order[] = [
    {
        id: 'O001',
        orderNumber: '#1925',
        type: 'dine-in',
        status: 'preparing',
        customer: '桌位 1',
        items: [
            { name: '宫保鸡丁', qty: 2, price: 14 },
            { name: '炒饭', qty: 1, price: 8 },
        ],
        total: 36,
        time: '2 分钟前',
        table: 1,
    },
    {
        id: 'O002',
        orderNumber: '#1924',
        type: 'delivery',
        status: 'pending',
        customer: 'Mike Johnson',
        items: [
            { name: '麻婆豆腐', qty: 1, price: 12 },
            { name: '蒸饺 x2', qty: 2, price: 16 },
        ],
        total: 28,
        time: '5 分钟前',
        platform: 'DoorDash',
    },
    {
        id: 'O003',
        orderNumber: '#1923',
        type: 'takeout',
        status: 'ready',
        customer: '张女士',
        items: [
            { name: '红烧肉', qty: 1, price: 16 },
            { name: '米饭 x2', qty: 2, price: 4 },
        ],
        total: 20,
        time: '8 分钟前',
    },
    {
        id: 'O004',
        orderNumber: '#1922',
        type: 'dine-in',
        status: 'completed',
        customer: '桌位 7',
        items: [
            { name: '左宗棠鸡', qty: 1, price: 16 },
            { name: '蒙古牛肉', qty: 1, price: 17 },
            { name: '炒面', qty: 2, price: 18 },
        ],
        total: 51,
        time: '15 分钟前',
        table: 7,
    },
    {
        id: 'O005',
        orderNumber: '#1921',
        type: 'delivery',
        status: 'completed',
        customer: 'Lisa Chen',
        items: [
            { name: '芝麻鸡', qty: 2, price: 28 },
        ],
        total: 28,
        time: '22 分钟前',
        platform: 'Uber Eats',
    },
];

const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: '待处理', color: '#FF9500' },
    preparing: { label: '制作中', color: '#007AFF' },
    ready: { label: '待取餐', color: '#34C759' },
    completed: { label: '已完成', color: '#8E8E93' },
    cancelled: { label: '已取消', color: '#FF3B30' },
};

const typeLabels: Record<string, { label: string; icon: string }> = {
    'dine-in': { label: '堂食', icon: '/assets/icon-pos-new.png' },
    'takeout': { label: '外带', icon: '/assets/icon-menu-new.png' },
    'delivery': { label: '外卖', icon: '/assets/icon-delivery-new.png' },
};

type FilterType = 'all' | 'pending' | 'preparing' | 'ready' | 'completed';

export const Orders: React.FC = () => {
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const filteredOrders = filter === 'all'
        ? mockOrders
        : mockOrders.filter(o => o.status === filter);

    const stats = {
        pending: mockOrders.filter(o => o.status === 'pending').length,
        preparing: mockOrders.filter(o => o.status === 'preparing').length,
        ready: mockOrders.filter(o => o.status === 'ready').length,
        completed: mockOrders.filter(o => o.status === 'completed').length,
    };

    return (
        <div className="orders-page page">
            <header className="page-header">
                <div className="container flex-between">
                    <div>
                        <h1 className="page-title">订单管理</h1>
                        <p className="page-subtitle">
                            今日订单 <span className="highlight">{mockOrders.length}</span> 单
                        </p>
                    </div>
                    <div className="order-stats-mini">
                        <span className="stat-item pending">{stats.pending} 待处理</span>
                        <span className="stat-item preparing">{stats.preparing} 制作中</span>
                        <span className="stat-item ready">{stats.ready} 待取餐</span>
                    </div>
                </div>
            </header>

            <div className="page-content">
                <div className="container">
                    {/* 筛选标签 */}
                    <div className="filter-tabs">
                        <button
                            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            全部 <span className="count">{mockOrders.length}</span>
                        </button>
                        <button
                            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                            onClick={() => setFilter('pending')}
                        >
                            待处理 <span className="count">{stats.pending}</span>
                        </button>
                        <button
                            className={`filter-btn ${filter === 'preparing' ? 'active' : ''}`}
                            onClick={() => setFilter('preparing')}
                        >
                            制作中 <span className="count">{stats.preparing}</span>
                        </button>
                        <button
                            className={`filter-btn ${filter === 'ready' ? 'active' : ''}`}
                            onClick={() => setFilter('ready')}
                        >
                            待取餐 <span className="count">{stats.ready}</span>
                        </button>
                        <button
                            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
                            onClick={() => setFilter('completed')}
                        >
                            已完成 <span className="count">{stats.completed}</span>
                        </button>
                    </div>

                    <div className="orders-layout">
                        {/* 订单列表 */}
                        <div className="orders-list">
                            {filteredOrders.map(order => (
                                <div
                                    key={order.id}
                                    className={`order-card card ${selectedOrder?.id === order.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedOrder(order)}
                                >
                                    <div className="order-header">
                                        <div className="order-id">
                                            <span className="order-number">{order.orderNumber}</span>
                                            <span
                                                className="order-status"
                                                style={{
                                                    background: `${statusLabels[order.status].color}20`,
                                                    color: statusLabels[order.status].color
                                                }}
                                            >
                                                {statusLabels[order.status].label}
                                            </span>
                                        </div>
                                        <div className="order-type">
                                            <img src={typeLabels[order.type].icon} alt="" style={{ width: 16, opacity: 0.7 }} />
                                            <span>{typeLabels[order.type].label}</span>
                                            {order.platform && <span className="platform-tag">{order.platform}</span>}
                                        </div>
                                    </div>
                                    <div className="order-customer">{order.customer}</div>
                                    <div className="order-items-preview">
                                        {order.items.slice(0, 2).map((item, i) => (
                                            <span key={i}>{item.name} x{item.qty}</span>
                                        ))}
                                        {order.items.length > 2 && <span>+{order.items.length - 2} 更多</span>}
                                    </div>
                                    <div className="order-footer">
                                        <span className="order-total">${order.total.toFixed(2)}</span>
                                        <span className="order-time">{order.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 订单详情 */}
                        <div className="order-detail card">
                            {selectedOrder ? (
                                <>
                                    <div className="detail-header">
                                        <div>
                                            <h3>{selectedOrder.orderNumber}</h3>
                                            <span className="detail-time">{selectedOrder.time}</span>
                                        </div>
                                        <span
                                            className="status-badge large"
                                            style={{
                                                background: `${statusLabels[selectedOrder.status].color}20`,
                                                color: statusLabels[selectedOrder.status].color
                                            }}
                                        >
                                            {statusLabels[selectedOrder.status].label}
                                        </span>
                                    </div>

                                    <div className="detail-section">
                                        <h4>订单信息</h4>
                                        <div className="info-grid">
                                            <div className="info-item">
                                                <span className="label">类型</span>
                                                <span className="value">{typeLabels[selectedOrder.type].label}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="label">顾客</span>
                                                <span className="value">{selectedOrder.customer}</span>
                                            </div>
                                            {selectedOrder.platform && (
                                                <div className="info-item">
                                                    <span className="label">平台</span>
                                                    <span className="value">{selectedOrder.platform}</span>
                                                </div>
                                            )}
                                            {selectedOrder.table && (
                                                <div className="info-item">
                                                    <span className="label">桌号</span>
                                                    <span className="value">桌位 {selectedOrder.table}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="detail-section">
                                        <h4>菜品明细</h4>
                                        <div className="items-list">
                                            {selectedOrder.items.map((item, i) => (
                                                <div key={i} className="item-row">
                                                    <span className="item-name">{item.name}</span>
                                                    <span className="item-qty">x{item.qty}</span>
                                                    <span className="item-price">${item.price.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="total-row">
                                            <span>合计</span>
                                            <span className="total-amount">${selectedOrder.total.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="detail-actions">
                                        {selectedOrder.status === 'pending' && (
                                            <button className="btn btn-primary btn-block">开始制作</button>
                                        )}
                                        {selectedOrder.status === 'preparing' && (
                                            <button className="btn btn-success btn-block">制作完成</button>
                                        )}
                                        {selectedOrder.status === 'ready' && (
                                            <button className="btn btn-primary btn-block">完成取餐</button>
                                        )}
                                        {selectedOrder.status === 'completed' && (
                                            <button className="btn btn-ghost btn-block">打印小票</button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="empty-state">
                                    <img src="/assets/icon-orders-new.png" alt="" style={{ width: 64, opacity: 0.3 }} />
                                    <p>选择一个订单查看详情</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Orders;
