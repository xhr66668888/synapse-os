'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, CreateOrderRequest } from '@/lib/api';
import {
    Search,
    Flame,
    Utensils,
    Coffee,
    ShoppingCart,
    Trash2,
    CreditCard,
    Plus,
    Minus,
    X,
    ChevronRight,
    Pizza
} from 'lucide-react';

// Mock Sky
const categories = [
    { id: '1', name: '热门推荐', icon: Flame },
    { id: '2', name: '经典炒菜', icon: Utensils },
    { id: '3', name: '主食点心', icon: Pizza },
    { id: '4', name: '特色饮品', icon: Coffee },
];

const mockProducts = [
    { id: '101', categoryId: '1', name: '宫保鸡丁', price: 12.50, image: '🍗', popular: true },
    { id: '102', categoryId: '1', name: '麻婆豆腐', price: 9.99, image: '🥘', popular: true },
    { id: '103', categoryId: '2', name: '鱼香肉丝', price: 11.50, image: '🥩' },
    { id: '104', categoryId: '3', name: '扬州炒饭', price: 8.50, image: '🍚' },
    { id: '105', categoryId: '3', name: '米饭', price: 1.50, image: '🍚' },
    { id: '106', categoryId: '4', name: '可乐', price: 2.00, image: '🥤' },
    { id: '107', categoryId: '3', name: '水饺 (12个)', price: 10.00, image: '🥟' },
    { id: '108', categoryId: '2', name: '回锅肉', price: 13.50, image: '🥓' },
    { id: '109', categoryId: '1', name: '糖醋排骨', price: 14.00, image: '🍖', popular: true },
    { id: '110', categoryId: '4', name: '雪碧', price: 2.00, image: '🥤' },
];

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    modifiers: string[];
}

export function POSContent() {
    const [activeCategory, setActiveCategory] = useState('1');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<any>(null); // For customization modal
    const [orderType, setOrderType] = useState<'dine-in' | 'takeout' | 'delivery'>('dine-in');

    const addToCart = (product: any, modifiers: string[] = []) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id && JSON.stringify(item.modifiers) === JSON.stringify(modifiers));
            if (existing) {
                return prev.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1, modifiers }];
        });
        setSelectedProduct(null);
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const updateQuantity = (index: number, delta: number) => {
        setCart(prev => prev.map((item, i) => {
            if (i === index) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const filteredProducts = mockProducts.filter(p =>
        (activeCategory === 'all' || p.categoryId === activeCategory) &&
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-bg-secondary overflow-hidden">
            {/* Menu Area */}
            <div className="flex-1 flex flex-col min-w-0 pr-0">
                <header className="px-8 py-6 bg-white/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between sticky top-0 z-10">
                    <h1 className="text-2xl font-bold text-text-primary">POS 点餐</h1>
                    <div className="flex bg-bg-tertiary rounded-xl p-1">
                        {[
                            { id: 'dine-in', label: '堂食' },
                            { id: 'takeout', label: '外带' },
                            { id: 'delivery', label: '外卖' }
                        ].map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setOrderType(type.id as any)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${orderType === type.id
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-text-secondary hover:text-text-primary'
                                    }`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Categories */}
                <div className="px-8 py-4 flex gap-3 overflow-x-auto scrollbar-hide bg-white/50 backdrop-blur-sm">
                    {categories.map(cat => {
                        const Icon = cat.icon;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all whitespace-nowrap ${activeCategory === cat.id
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
                                        : 'bg-white text-text-secondary border border-border/50 hover:bg-bg-hover'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="font-medium">{cat.name}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Products Grid */}
                <div className="flex-1 p-8 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
                        {filteredProducts.map(product => (
                            <button
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="card p-4 flex flex-col items-center text-center group active:scale-95"
                            >
                                <div className="w-24 h-24 mb-4 text-6xl flex items-center justify-center bg-bg-secondary rounded-full group-hover:scale-110 transition-transform">
                                    {/* Wait, keeping emoji here for food image fallback as I don't have real images. 
                      User said "Delete ALL emoji", but for food images, if I don't have assets, 
                      maybe icons or text? Let's use a placeholder icon from Lucide if no image.
                      Actually, let's keep the emojis as "images" for now since I don't have real jpgs, 
                      but wrap them nicely. Or use Utensils icon as placeholder.
                      The instructions said "Delete all emoji use suitable icon url inside".
                      I'll use a generic colored div with an icon for now to be strictly compliant.
                  */}
                                    <Utensils className="w-10 h-10 text-primary/50" />
                                </div>
                                <h3 className="font-bold text-text-primary mb-1">{product.name}</h3>
                                <span className="text-primary font-bold">${product.price.toFixed(2)}</span>
                                {product.popular && (
                                    <span className="mt-2 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-bold rounded-full">
                                        热门
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Cart Sidebar */}
            <div className="w-96 bg-white border-l border-border shadow-xl flex flex-col z-20">
                <div className="p-6 border-b border-border/50">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" /> 当前订单
                            {cart.length > 0 && (
                                <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">{cart.length}</span>
                            )}
                        </h2>
                        <button
                            onClick={() => setCart([])}
                            className="text-sm text-text-muted hover:text-error transition-colors flex items-center gap-1"
                        >
                            <Trash2 className="w-4 h-4" /> 清空
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="输入桌号..."
                            className="input-field pl-10"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-text-muted">
                            <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                            <p>购物车是空的</p>
                        </div>
                    ) : (
                        cart.map((item, index) => (
                            <div key={index} className="flex flex-col p-3 rounded-xl bg-bg-secondary/50 border border-transparent hover:border-border transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium text-text-primary">{item.name}</span>
                                    <span className="font-bold text-text-primary">${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                                {item.modifiers.length > 0 && (
                                    <div className="text-xs text-text-muted mb-2 flex flex-wrap gap-1">
                                        {item.modifiers.map(mod => (
                                            <span key={mod} className="px-1.5 py-0.5 bg-white rounded border border-border/50">{mod}</span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-text-muted">${item.price.toFixed(2)} / 份</span>
                                    <div className="flex items-center gap-3 bg-white rounded-lg p-1 shadow-sm border border-border/20">
                                        <button
                                            onClick={() => updateQuantity(index, -1)}
                                            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-bg-hover text-text-secondary"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(index, 1)}
                                            className="w-6 h-6 flex items-center justify-center rounded-md bg-primary text-white hover:bg-primary-dark"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 bg-bg-secondary/30 border-t border-border/50">
                    <div className="space-y-2 mb-4 text-sm">
                        <div className="flex justify-between text-text-secondary">
                            <span>小计</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-text-secondary">
                            <span>税费 (8%)</span>
                            <span>${(total * 0.08).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-text-primary pt-2 border-t border-border/50">
                            <span>总计</span>
                            <span className="text-primary">${(total * 1.08).toFixed(2)}</span>
                        </div>
                    </div>
                    <button
                        className="w-full btn btn-primary py-4 text-lg shadow-xl shadow-primary/20"
                        disabled={cart.length === 0}
                    >
                        <CreditCard className="w-5 h-5" />
                        收款 ${(total * 1.08).toFixed(2)}
                    </button>
                </div>
            </div>
        </div>
    );
}
