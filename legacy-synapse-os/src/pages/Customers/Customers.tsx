import React, { useState } from 'react';
import './Customers.css';

// 模拟顾客数据
const mockCustomers = [
    {
        id: 'C001',
        name: '张明',
        phone: '138****1234',
        email: 'zhang@example.com',
        totalOrders: 28,
        totalSpent: 842.50,
        lastVisit: '2026-01-27',
        tasteProfile: { salt: 3, spice: 4, oil: 2, sweet: 3 },
        tags: ['常客', 'VIP'],
        notes: '不能吃花生，过敏'
    },
    {
        id: 'C002',
        name: 'Mike Johnson',
        phone: '415****5678',
        email: 'mike@example.com',
        totalOrders: 12,
        totalSpent: 356.00,
        lastVisit: '2026-01-25',
        tasteProfile: { salt: 3, spice: 1, oil: 3, sweet: 4 },
        tags: ['外卖常客'],
        notes: '喜欢多加酱汁'
    },
    {
        id: 'C003',
        name: '李静',
        phone: '139****9012',
        email: 'lijing@example.com',
        totalOrders: 45,
        totalSpent: 1280.00,
        lastVisit: '2026-01-28',
        tasteProfile: { salt: 4, spice: 5, oil: 3, sweet: 2 },
        tags: ['常客', 'VIP', '烈辣爱好者'],
        notes: ''
    },
    {
        id: 'C004',
        name: 'Emily Chen',
        phone: '650****3456',
        email: 'emily.c@example.com',
        totalOrders: 8,
        totalSpent: 198.50,
        lastVisit: '2026-01-20',
        tasteProfile: { salt: 2, spice: 2, oil: 1, sweet: 3 },
        tags: ['健康饮食'],
        notes: '少油少盐'
    },
];

// 口味等级描述
const tasteLevelLabels = {
    salt: ['极淡', '偏淡', '正常', '偏咸', '重咸'],
    spice: ['不辣', '微辣', '中辣', '辣', '特辣'],
    oil: ['少油', '偏少', '正常', '偏多', '多油'],
    sweet: ['不甜', '微甜', '正常', '偏甜', '很甜'],
};

interface Customer {
    id: string;
    name: string;
    phone: string;
    email: string;
    totalOrders: number;
    totalSpent: number;
    lastVisit: string;
    tasteProfile: { salt: number; spice: number; oil: number; sweet: number };
    tags: string[];
    notes: string;
}

export const Customers: React.FC = () => {
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editingTaste, setEditingTaste] = useState({ salt: 3, spice: 3, oil: 3, sweet: 3 });

    const filteredCustomers = mockCustomers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setEditingTaste(customer.tasteProfile);
        setIsEditing(false);
    };

    const TasteBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
        <div className="taste-bar-row">
            <span className="taste-bar-label">{label}</span>
            <div className="taste-bar-track">
                <div
                    className="taste-bar-fill"
                    style={{ width: `${value * 20}%`, backgroundColor: color }}
                />
            </div>
            <span className="taste-bar-value">{tasteLevelLabels[label.toLowerCase() as keyof typeof tasteLevelLabels]?.[value - 1] || '正常'}</span>
        </div>
    );

    return (
        <div className="customers-page page">
            <header className="page-header">
                <div className="container flex-between">
                    <div>
                        <h1 className="page-title">顾客管理</h1>
                        <p className="page-subtitle">管理顾客档案和口味偏好数据</p>
                    </div>
                    <button className="btn btn-primary">
                        <span className="btn-icon">+</span>
                        添加顾客
                    </button>
                </div>
            </header>

            <div className="page-content">
                <div className="container">
                    <div className="customers-layout">
                        {/* 顾客列表 */}
                        <div className="customers-list-section">
                            <div className="search-box">
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="搜索顾客姓名、电话、邮箱..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="customers-list card">
                                <div className="list-header">
                                    <span className="list-count">{filteredCustomers.length} 位顾客</span>
                                </div>
                                {filteredCustomers.map(customer => (
                                    <div
                                        key={customer.id}
                                        className={`customer-row ${selectedCustomer?.id === customer.id ? 'active' : ''}`}
                                        onClick={() => handleSelectCustomer(customer)}
                                    >
                                        <div className="customer-avatar">
                                            {customer.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="customer-info">
                                            <div className="customer-name">{customer.name}</div>
                                            <div className="customer-meta">
                                                {customer.phone} · {customer.totalOrders} 单
                                            </div>
                                        </div>
                                        <div className="customer-tags">
                                            {customer.tags.slice(0, 2).map(tag => (
                                                <span key={tag} className="tag">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 顾客详情 */}
                        <div className="customer-detail-section">
                            {selectedCustomer ? (
                                <div className="customer-detail card">
                                    <div className="detail-header">
                                        <div className="detail-avatar-large">
                                            {selectedCustomer.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="detail-info">
                                            <h2>{selectedCustomer.name}</h2>
                                            <p className="text-muted">{selectedCustomer.email}</p>
                                            <div className="detail-tags">
                                                {selectedCustomer.tags.map(tag => (
                                                    <span key={tag} className="tag tag-primary">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="detail-stats">
                                        <div className="stat-box">
                                            <div className="stat-value">{selectedCustomer.totalOrders}</div>
                                            <div className="stat-label">历史订单</div>
                                        </div>
                                        <div className="stat-box">
                                            <div className="stat-value">${selectedCustomer.totalSpent.toFixed(0)}</div>
                                            <div className="stat-label">累计消费</div>
                                        </div>
                                        <div className="stat-box">
                                            <div className="stat-value">{selectedCustomer.lastVisit}</div>
                                            <div className="stat-label">最近到店</div>
                                        </div>
                                    </div>

                                    {/* 口味偏好 */}
                                    <div className="taste-section">
                                        <div className="section-header">
                                            <h3>口味档案</h3>
                                            {!isEditing ? (
                                                <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(true)}>
                                                    编辑
                                                </button>
                                            ) : (
                                                <div className="edit-btns">
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(false)}>取消</button>
                                                    <button className="btn btn-primary btn-sm" onClick={() => setIsEditing(false)}>保存</button>
                                                </div>
                                            )}
                                        </div>

                                        {isEditing ? (
                                            <div className="taste-edit-sliders">
                                                {(['salt', 'spice', 'oil', 'sweet'] as const).map(key => (
                                                    <div key={key} className="taste-edit-row">
                                                        <label>{key === 'salt' ? '咸度' : key === 'spice' ? '辣度' : key === 'oil' ? '油量' : '甜度'}</label>
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="5"
                                                            value={editingTaste[key]}
                                                            onChange={(e) => setEditingTaste({ ...editingTaste, [key]: parseInt(e.target.value) })}
                                                        />
                                                        <span>{tasteLevelLabels[key][editingTaste[key] - 1]}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="taste-bars">
                                                <TasteBar label="Salt" value={selectedCustomer.tasteProfile.salt} color="#6b7280" />
                                                <TasteBar label="Spice" value={selectedCustomer.tasteProfile.spice} color="#ef4444" />
                                                <TasteBar label="Oil" value={selectedCustomer.tasteProfile.oil} color="#eab308" />
                                                <TasteBar label="Sweet" value={selectedCustomer.tasteProfile.sweet} color="#f97316" />
                                            </div>
                                        )}
                                    </div>

                                    {/* 备注 */}
                                    {selectedCustomer.notes && (
                                        <div className="notes-section">
                                            <h3>备注</h3>
                                            <p className="notes-content">{selectedCustomer.notes}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="empty-detail card">
                                    <img src="/assets/icon-profile-new.png" alt="" style={{ width: 48, opacity: 0.3 }} />
                                    <p>选择一位顾客查看详情</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Customers;
