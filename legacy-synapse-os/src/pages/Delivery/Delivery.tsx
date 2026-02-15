import React, { useState } from 'react';
import './Delivery.css';

// 外卖平台配置 - 使用真实品牌图标
const platforms = [
    { id: 'doordash', name: 'DoorDash', icon: '/assets/icon-doordash.png', connected: true },
    { id: 'ubereats', name: 'Uber Eats', icon: '/assets/icon-ubereats.png', connected: false },
    { id: 'grubhub', name: 'Grubhub', icon: '/assets/icon-grubhub.png', connected: true },
];

const mockOrders = [
    { id: '#D1001', platform: 'doordash', items: '左宗棠鸡 x1, 春卷 x4', total: '$24.50', status: 'ready', driver: 'Mike T.', estimatedPickup: '18:45', address: '123 Main St, Suite 100' },
    { id: '#U2045', platform: 'ubereats', items: '芝麻鸡 x1, 炒饭 x1', total: '$19.20', status: 'preparing', driver: '等待分配', estimatedPickup: '18:55', address: '456 Oak Ave, Apt 2B' },
    { id: '#G3021', platform: 'grubhub', items: '蒙古牛 x1, 白饭 x1', total: '$22.00', status: 'new', driver: '分配中', estimatedPickup: '19:00', address: '789 Pine Rd' },
];

export const Delivery: React.FC = () => {
    return (
        <div className="delivery-page page">
            <header className="page-header">
                <div className="container">
                    <h1 className="page-title">外卖管理</h1>
                    <p className="page-subtitle">管理第三方外卖平台订单</p>
                </div>
            </header>

            <div className="page-content">
                <div className="container">
                    {/* 平台状态 */}
                    <div className="platforms-grid">
                        {platforms.map(p => (
                            <div key={p.id} className="platform-card card">
                                <div className="platform-header">
                                    <div className="platform-info">
                                        <img src={p.icon} alt={p.name} className="platform-icon" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
                                        <h3 className="platform-name">{p.name}</h3>
                                    </div>
                                    <label className={`toggle-btn ${p.connected ? 'active' : ''}`}>
                                        <input type="checkbox" defaultChecked={p.connected} />
                                        <span className="toggle-knob"></span>
                                    </label>
                                </div>
                                <div className="platform-status">
                                    {p.connected ? (
                                        <span className="status-connected">
                                            <span className="status-dot"></span>
                                            自动接单中
                                        </span>
                                    ) : (
                                        <span className="status-disconnected">
                                            <span className="status-dot"></span>
                                            已暂停接单
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 订单列表 */}
                    <div className="delivery-orders mt-lg">
                        <h2 className="section-title mb-md">进行中订单</h2>
                        <div className="orders-list card">
                            {mockOrders.map(order => (
                                <div key={order.id} className="delivery-order-item">
                                    <div className="order-main">
                                        <div className="order-header-line">
                                            <span className="order-id-badge">{order.id}</span>
                                            <span className="platform-tag">
                                                <img
                                                    src={platforms.find(p => p.id === order.platform)?.icon}
                                                    alt=""
                                                    style={{ width: '16px', height: '16px', marginRight: '6px', borderRadius: '3px' }}
                                                />
                                                {platforms.find(p => p.id === order.platform)?.name}
                                            </span>
                                        </div>
                                        <div className="order-items-text">{order.items}</div>
                                        <div className="order-address-line">
                                            <img src="/assets/icon-delivery-new.png" alt="" style={{ width: '14px', opacity: 0.6, marginRight: '6px' }} />
                                            {order.address}
                                        </div>
                                    </div>

                                    <div className="order-status-section">
                                        <div className={`status-pill ${order.status}`}>
                                            {order.status === 'new' && '新订单'}
                                            {order.status === 'preparing' && '制作中'}
                                            {order.status === 'ready' && '待取餐'}
                                        </div>
                                        <div className="driver-info">
                                            <div>司机: {order.driver}</div>
                                            <div className="pickup-time">预计: {order.estimatedPickup}</div>
                                        </div>
                                    </div>

                                    <div className="order-actions">
                                        {order.status === 'new' && <button className="btn btn-primary btn-sm">接单</button>}
                                        {order.status === 'preparing' && <button className="btn btn-success btn-sm">制作完成</button>}
                                        {order.status === 'ready' && <button className="btn btn-ghost btn-sm">已取餐</button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Delivery;
