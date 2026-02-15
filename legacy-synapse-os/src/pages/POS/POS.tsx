import React, { useState } from 'react';
import './POS.css';
import '../../components/CssIcons.css';

// 模拟数据
const categories = [
    { id: '1', name: '热门推荐', icon: '/assets/icon-pos-new.png' },
    { id: '2', name: '经典炒菜', icon: '/assets/icon-food-new.png' },
    { id: '3', name: '主食', icon: '/assets/icon-orders-new.png' },
    { id: '4', name: '饮品', icon: '/assets/icon-kds-new.png' },
];

const menuItems = [
    { id: '101', name: '宫保鸡丁', price: 12.50, categoryId: '2', image: '/assets/icon-food-new.png' },
    { id: '102', name: '麻婆豆腐', price: 9.99, categoryId: '2', image: '/assets/icon-food-new.png' },
    { id: '103', name: '鱼香肉丝', price: 11.50, categoryId: '2', image: '/assets/icon-food-new.png' },
    { id: '104', name: '扬州炒饭', price: 8.50, categoryId: '3', image: '/assets/icon-orders-new.png' },
    { id: '105', name: '米饭', price: 1.50, categoryId: '3', image: '/assets/icon-orders-new.png' },
    { id: '106', name: '可乐', price: 2.00, categoryId: '4', image: '/assets/icon-kds-new.png' },
    { id: '107', name: '水饺 (12个)', price: 10.00, categoryId: '3', image: '/assets/icon-orders-new.png' },
    { id: '108', name: '回锅肉', price: 13.50, categoryId: '2', image: '/assets/icon-food-new.png' },
];

interface CartItem {
    id: string;
    name: string;
    price: number;
    qty: number;
    image: string;
}

export const POS: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState('1');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orderType, setOrderType] = useState<'dine_in' | 'takeout' | 'delivery'>('dine_in');

    // 口味定制状态
    const [showTasteModal, setShowTasteModal] = useState(false);
    const [selectedItemForTaste, setSelectedItemForTaste] = useState<any>(null);
    const [tastePreferences, setTastePreferences] = useState({
        spicy: 50,
        salty: 50,
        oil: 50
    });

    const addToCart = (item: any) => {
        // 如果是炒菜类（这里简单判断categoryId为2），则打开口味定制
        if (item.categoryId === '2') {
            setSelectedItemForTaste(item);
            setShowTasteModal(true);
            // 重置口味偏好
            setTastePreferences({ spicy: 50, salty: 50, oil: 50 });
        } else {
            // 直接加入购物车
            addItemToCartSimple(item);
        }
    };

    const addItemToCartSimple = (item: any) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { ...item, qty: 1 }];
        });
    };

    const confirmTasteAndAdd = () => {
        if (selectedItemForTaste) {
            addItemToCartSimple(selectedItemForTaste);
            setShowTasteModal(false);
            setSelectedItemForTaste(null);
            // 这里未来会将口味偏好作为备注加入订单项
            console.log("Applied taste:", tastePreferences);
        }
    };

    const updateQty = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, qty: Math.max(0, item.qty + delta) };
            }
            return item;
        }).filter(item => item.qty > 0));
    };

    const clearCart = () => setCart([]);

    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    const filteredItems = activeCategory === '1'
        ? menuItems // 热门显示所有
        : menuItems.filter(item => item.categoryId === activeCategory);

    return (
        <div className="pos-page page">
            <header className="page-header">
                <div className="container flex-between">
                    <h1 className="page-title">POS 点餐</h1>

                    <div className="order-type-selector">
                        <button
                            className={`order-type-btn ${orderType === 'dine_in' ? 'active' : ''}`}
                            onClick={() => setOrderType('dine_in')}
                        >
                            堂食
                        </button>
                        <button
                            className={`order-type-btn ${orderType === 'takeout' ? 'active' : ''}`}
                            onClick={() => setOrderType('takeout')}
                        >
                            外带
                        </button>
                        <button
                            className={`order-type-btn ${orderType === 'delivery' ? 'active' : ''}`}
                            onClick={() => setOrderType('delivery')}
                        >
                            外卖
                        </button>
                    </div>
                </div>
            </header>

            <div className="pos-layout">
                {/* 菜单区域 */}
                <div className="menu-section">
                    <div className="category-tabs">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat.id)}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    <div className="menu-grid">
                        {filteredItems.map(item => (
                            <div key={item.id} className="menu-item-card" onClick={() => addToCart(item)}>
                                <div className="menu-item-image">
                                    <img src={item.image} alt={item.name} style={{ width: '32px', height: '32px', opacity: 0.8 }} />
                                </div>
                                <div className="menu-item-name">{item.name}</div>
                                <div className="menu-item-price">${item.price.toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 购物车区域 */}
                <div className="cart-section">
                    <div className="cart-header">
                        <h2>
                            当前订单
                            <span className="cart-count">
                                {cart.reduce((s, i) => s + i.qty, 0)}
                            </span>
                        </h2>
                        <button className="clear-cart-btn" onClick={clearCart}>清空</button>
                    </div>

                    <div className="cart-type-indicator">
                        <span className="badge badge-primary">
                            {orderType === 'dine_in' && '堂食'}
                            {orderType === 'takeout' && '外带'}
                            {orderType === 'delivery' && '外卖'}
                        </span>
                    </div>

                    {cart.length === 0 ? (
                        <div className="cart-empty">
                            <span className="icon-cart-empty"></span>
                            <p>购物车是空的</p>
                        </div>
                    ) : (
                        <div className="cart-items">
                            {cart.map(item => (
                                <div key={item.id} className="cart-item">
                                    <div className="cart-item-info">
                                        <div className="cart-item-name">{item.name}</div>
                                        <div className="cart-item-price">${item.price.toFixed(2)}</div>
                                    </div>
                                    <div className="cart-item-qty">
                                        <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>
                                            <span className="icon-css icon-minus"></span>
                                        </button>
                                        <span className="qty-value">{item.qty}</span>
                                        <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>
                                            <span className="icon-css icon-plus"></span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="cart-summary">
                        <div className="summary-row">
                            <span>小计</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                        <div className="summary-row">
                            <span>税费 (8%)</span>
                            <span>${(total * 0.08).toFixed(2)}</span>
                        </div>
                        <div className="summary-row total">
                            <span>总计</span>
                            <span>${(total * 1.08).toFixed(2)}</span>
                        </div>

                        <button className="btn btn-primary checkout-btn" disabled={cart.length === 0}>
                            收款 ${(total * 1.08).toFixed(2)}
                        </button>
                    </div>
                </div>
            </div>

            {/* 口味定制 Modal */}
            {showTasteModal && (
                <div className="modal-overlay animate-fade-in">
                    <div className="modal taste-modal animate-scale-in">
                        <div className="modal-header">
                            <h3>口味定制 - {selectedItemForTaste?.name}</h3>
                            <button className="close-btn" onClick={() => setShowTasteModal(false)}>
                                <span className="icon-css icon-close"></span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="taste-sliders">
                                <div className="taste-slider-row">
                                    <span className="taste-slider-label">辣度</span>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={tastePreferences.spicy}
                                        onChange={(e) => setTastePreferences({ ...tastePreferences, spicy: parseInt(e.target.value) })}
                                    />
                                    <span className="taste-slider-value">{tastePreferences.spicy}%</span>
                                </div>
                                <div className="taste-slider-row">
                                    <span className="taste-slider-label">咸度</span>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={tastePreferences.salty}
                                        onChange={(e) => setTastePreferences({ ...tastePreferences, salty: parseInt(e.target.value) })}
                                    />
                                    <span className="taste-slider-value">{tastePreferences.salty}%</span>
                                </div>
                                <div className="taste-slider-row">
                                    <span className="taste-slider-label">油量</span>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={tastePreferences.oil}
                                        onChange={(e) => setTastePreferences({ ...tastePreferences, oil: parseInt(e.target.value) })}
                                    />
                                    <span className="taste-slider-value">{tastePreferences.oil}%</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowTasteModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={confirmTasteAndAdd}>确认加入</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default POS;
