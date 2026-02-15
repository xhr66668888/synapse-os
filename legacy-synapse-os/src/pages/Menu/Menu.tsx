import React, { useState } from 'react';
import './Menu.css';

// 菜品数据
interface MenuItem {
    id: string;
    name: string;
    nameEn: string;
    category: string;
    price: number;
    cost: number;
    available: boolean;
    popular: boolean;
    image?: string;
    description?: string;
}

const mockMenuItems: MenuItem[] = [
    { id: 'M001', name: '宫保鸡丁', nameEn: 'Kung Pao Chicken', category: '招牌菜', price: 14, cost: 4.5, available: true, popular: true },
    { id: 'M002', name: '麻婆豆腐', nameEn: 'Mapo Tofu', category: '招牌菜', price: 12, cost: 3.2, available: true, popular: true },
    { id: 'M003', name: '左宗棠鸡', nameEn: "General Tso's", category: '招牌菜', price: 16, cost: 5.0, available: true, popular: false },
    { id: 'M004', name: '芝麻鸡', nameEn: 'Sesame Chicken', category: '鸡肉类', price: 14, cost: 4.2, available: true, popular: false },
    { id: 'M005', name: '蒙古牛肉', nameEn: 'Mongolian Beef', category: '牛肉类', price: 17, cost: 6.5, available: true, popular: true },
    { id: 'M006', name: '红烧肉', nameEn: 'Braised Pork', category: '猪肉类', price: 16, cost: 5.5, available: false, popular: false },
    { id: 'M007', name: '炒饭', nameEn: 'Fried Rice', category: '主食', price: 8, cost: 2.0, available: true, popular: false },
    { id: 'M008', name: '炒面', nameEn: 'Chow Mein', category: '主食', price: 9, cost: 2.2, available: true, popular: false },
    { id: 'M009', name: '蒸饺', nameEn: 'Steamed Dumplings', category: '点心', price: 8, cost: 2.5, available: true, popular: true },
    { id: 'M010', name: '春卷', nameEn: 'Spring Rolls', category: '点心', price: 6, cost: 1.8, available: true, popular: false },
];

const categories = ['全部', '招牌菜', '鸡肉类', '牛肉类', '猪肉类', '主食', '点心'];

export const Menu: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState('全部');
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = mockMenuItems.filter(item => {
        const matchesCategory = selectedCategory === '全部' || item.category === selectedCategory;
        const matchesSearch = item.name.includes(searchQuery) || item.nameEn.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const stats = {
        total: mockMenuItems.length,
        available: mockMenuItems.filter(i => i.available).length,
        popular: mockMenuItems.filter(i => i.popular).length,
    };

    return (
        <div className="menu-page page">
            <header className="page-header">
                <div className="container flex-between">
                    <div>
                        <h1 className="page-title">菜单管理</h1>
                        <p className="page-subtitle">
                            共 <span className="highlight">{stats.total}</span> 道菜品，
                            <span className="available">{stats.available}</span> 道可售
                        </p>
                    </div>
                    <button className="btn btn-primary">
                        <span className="btn-icon">+</span>
                        添加菜品
                    </button>
                </div>
            </header>

            <div className="page-content">
                <div className="container">
                    {/* 搜索和分类 */}
                    <div className="menu-toolbar">
                        <div className="search-box">
                            <img src="/assets/icon-settings-new.png" alt="" style={{ width: 18, opacity: 0.5 }} />
                            <input
                                type="text"
                                placeholder="搜索菜品名称..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="category-tabs">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="menu-layout">
                        {/* 菜品网格 */}
                        <div className="menu-grid">
                            {filteredItems.map(item => (
                                <div
                                    key={item.id}
                                    className={`menu-item-card card ${!item.available ? 'unavailable' : ''} ${selectedItem?.id === item.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedItem(item)}
                                >
                                    <div className="item-image">
                                        <div className="image-placeholder">
                                            <img src="/assets/icon-menu-new.png" alt="" style={{ width: 32, opacity: 0.3 }} />
                                        </div>
                                        {item.popular && <span className="popular-badge">热销</span>}
                                        {!item.available && <div className="unavailable-overlay">已售罄</div>}
                                    </div>
                                    <div className="item-info">
                                        <div className="item-name">{item.name}</div>
                                        <div className="item-name-en">{item.nameEn}</div>
                                        <div className="item-footer">
                                            <span className="item-price">${item.price}</span>
                                            <span className="item-category">{item.category}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 菜品详情 */}
                        <div className="menu-detail card">
                            {selectedItem ? (
                                <>
                                    <div className="detail-image">
                                        <div className="image-placeholder large">
                                            <img src="/assets/icon-menu-new.png" alt="" style={{ width: 64, opacity: 0.3 }} />
                                        </div>
                                    </div>
                                    <div className="detail-content">
                                        <div className="detail-header">
                                            <div>
                                                <h3>{selectedItem.name}</h3>
                                                <span className="name-en">{selectedItem.nameEn}</span>
                                            </div>
                                            <div className="availability-toggle">
                                                <span className={selectedItem.available ? 'on' : 'off'}>
                                                    {selectedItem.available ? '可售' : '售罄'}
                                                </span>
                                                <div className={`toggle ${selectedItem.available ? 'active' : ''}`}>
                                                    <div className="toggle-handle"></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="detail-section">
                                            <h4>价格信息</h4>
                                            <div className="price-info">
                                                <div className="price-item">
                                                    <span className="label">售价</span>
                                                    <span className="value price">${selectedItem.price.toFixed(2)}</span>
                                                </div>
                                                <div className="price-item">
                                                    <span className="label">成本</span>
                                                    <span className="value">${selectedItem.cost.toFixed(2)}</span>
                                                </div>
                                                <div className="price-item">
                                                    <span className="label">毛利</span>
                                                    <span className="value profit">
                                                        ${(selectedItem.price - selectedItem.cost).toFixed(2)}
                                                        <small> ({Math.round((1 - selectedItem.cost / selectedItem.price) * 100)}%)</small>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="detail-section">
                                            <h4>分类</h4>
                                            <span className="category-tag">{selectedItem.category}</span>
                                        </div>

                                        <div className="detail-section">
                                            <h4>标签</h4>
                                            <div className="tags">
                                                {selectedItem.popular && <span className="tag popular">热销</span>}
                                                <span className="tag">{selectedItem.category}</span>
                                            </div>
                                        </div>

                                        <div className="detail-actions">
                                            <button className="btn btn-primary">编辑菜品</button>
                                            <button className="btn btn-ghost">删除</button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="empty-state">
                                    <img src="/assets/icon-menu-new.png" alt="" style={{ width: 64, opacity: 0.3 }} />
                                    <p>选择一道菜品查看详情</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Menu;
