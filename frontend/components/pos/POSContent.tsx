'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, CreateOrderRequest } from '@/lib/api';
import { TerminalProvider } from '@/lib/terminal-context';
import { useAudio } from '@/lib/audio';
import { NumericKeypad } from '@/components/ui/NumericKeypad';
import {
    Search,
    ShoppingCart,
    Trash2,
    CreditCard,
    Plus,
    Minus,
} from 'lucide-react';

const categories = [
    { id: '1', name: '热门推荐' },
    { id: '2', name: '经典炒菜' },
    { id: '3', name: '主食点心' },
    { id: '4', name: '特色饮品' },
];

const mockProducts = [
    { id: '101', categoryId: '1', name: '宫保鸡丁', price: 12.50, popular: true },
    { id: '102', categoryId: '1', name: '麻婆豆腐', price: 9.99, popular: true },
    { id: '103', categoryId: '2', name: '鱼香肉丝', price: 11.50 },
    { id: '104', categoryId: '3', name: '扬州炒饭', price: 8.50 },
    { id: '105', categoryId: '3', name: '米饭', price: 1.50 },
    { id: '106', categoryId: '4', name: '可乐', price: 2.00 },
    { id: '107', categoryId: '3', name: '水饺 (12个)', price: 10.00 },
    { id: '108', categoryId: '2', name: '回锅肉', price: 13.50 },
    { id: '109', categoryId: '1', name: '糖醋排骨', price: 14.00, popular: true },
    { id: '110', categoryId: '4', name: '雪碧', price: 2.00 },
];

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    modifiers: string[];
}

function POSInner() {
    const [activeCategory, setActiveCategory] = useState('1');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [orderType, setOrderType] = useState<'dine-in' | 'takeout' | 'delivery'>('dine-in');
    const [numpadValue, setNumpadValue] = useState('');
    const { playClick, playSuccess } = useAudio();

    const addToCart = (product: { id: string; name: string; price: number }) => {
        playClick();
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1, modifiers: [] }];
        });
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const updateQuantity = (index: number, delta: number) => {
        playClick();
        setCart(prev => prev.map((item, i) => {
            if (i === index) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = total * 0.08;
    const grandTotal = total + tax;

    const filteredProducts = mockProducts.filter(p =>
        (activeCategory === 'all' || p.categoryId === activeCategory) &&
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-surface-base overflow-hidden">
            {/* Menu Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header: Order type toggle */}
                <header className="px-4 py-3 bg-surface-raised border-b border-border flex items-center justify-between">
                    <h1 className="text-lg font-bold text-text-primary">POS 点餐</h1>
                    <div className="flex border border-border rounded-sm overflow-hidden">
                        {[
                            { id: 'dine-in', label: '堂食' },
                            { id: 'takeout', label: '外带' },
                            { id: 'delivery', label: '外卖' },
                        ].map(type => (
                            <button
                                key={type.id}
                                onClick={() => { setOrderType(type.id as typeof orderType); playClick(); }}
                                className={`px-5 py-2 text-sm font-bold transition-colors duration-75 ${
                                    orderType === type.id
                                        ? 'bg-action text-action-fg'
                                        : 'bg-surface-raised text-text-secondary hover:bg-surface-sunken'
                                }`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Categories — flat rectangular pills */}
                <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide border-b border-border bg-surface-raised">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => { setActiveCategory(cat.id); playClick(); }}
                            className={`px-4 py-2 rounded-sm text-sm font-bold whitespace-nowrap transition-colors duration-75 ${
                                activeCategory === cat.id
                                    ? 'bg-action text-action-fg'
                                    : 'bg-surface-sunken text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Products Grid — text-only color blocks, no images */}
                <div className="flex-1 p-4 overflow-y-auto">
                    <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {filteredProducts.map(product => (
                            <button
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="relative p-3 bg-surface-raised border border-border rounded-sm text-left transition-colors duration-75 hover:bg-surface-sunken active:bg-action active:text-action-fg group"
                                style={{ minHeight: '72px' }}
                            >
                                <div className="font-bold text-sm text-text-primary group-active:text-action-fg">
                                    {product.name}
                                </div>
                                <div className="font-mono tabular-nums text-sm text-text-secondary mt-1 group-active:text-action-fg">
                                    ¥{product.price.toFixed(2)}
                                </div>
                                {product.popular && (
                                    <span className="absolute top-1 right-1 badge-danger text-[9px] px-1 py-0">
                                        热门
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Cart Sidebar */}
            <div className="w-80 bg-surface-raised border-l border-border flex flex-col">
                {/* Cart header */}
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        当前订单
                        {cart.length > 0 && (
                            <span className="bg-action text-action-fg text-xs px-1.5 py-0.5 rounded-xs font-mono">
                                {cart.length}
                            </span>
                        )}
                    </h2>
                    <button
                        onClick={() => setCart([])}
                        className="text-xs text-danger font-bold hover:underline flex items-center gap-1"
                    >
                        <Trash2 className="w-3 h-3" /> 清空
                    </button>
                </div>

                {/* Cart items */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-text-muted">
                            <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm">购物车是空的</p>
                        </div>
                    ) : (
                        cart.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 py-2 border-b border-border-light text-sm" style={{ minHeight: '36px' }}>
                                <div className="flex-1 min-w-0">
                                    <span className="font-medium text-text-primary truncate block">{item.name}</span>
                                    <span className="text-xs text-text-muted font-mono tabular-nums">¥{item.price.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => updateQuantity(index, -1)}
                                        className="w-7 h-7 flex items-center justify-center rounded-xs bg-surface-sunken text-text-secondary hover:bg-border"
                                    >
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-6 text-center font-bold font-mono tabular-nums text-sm">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(index, 1)}
                                        className="w-7 h-7 flex items-center justify-center rounded-xs bg-action text-action-fg"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                                <span className="font-bold font-mono tabular-nums text-right w-16">
                                    ¥{(item.price * item.quantity).toFixed(2)}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                {/* Numpad */}
                <div className="px-3 py-2 border-t border-border">
                    <NumericKeypad
                        value={numpadValue}
                        onChange={setNumpadValue}
                        mode="quantity"
                    />
                </div>

                {/* Totals + Checkout */}
                <div className="px-4 py-3 border-t border-border bg-surface-sunken">
                    <div className="space-y-1 mb-3 text-sm">
                        <div className="flex justify-between text-text-secondary">
                            <span>小计</span>
                            <span className="font-mono tabular-nums">¥{total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-text-secondary">
                            <span>税费 (8%)</span>
                            <span className="font-mono tabular-nums">¥{tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-text-primary pt-2 border-t border-border">
                            <span>总计</span>
                            <span className="font-mono tabular-nums">¥{grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                    <button
                        className="w-full btn-action text-lg py-4 font-bold"
                        disabled={cart.length === 0}
                        onClick={() => playSuccess()}
                        style={{ minHeight: '56px' }}
                    >
                        <CreditCard className="w-5 h-5" />
                        收款 <span className="font-mono tabular-nums">¥{grandTotal.toFixed(2)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export function POSContent() {
    return (
        <TerminalProvider terminal="pos">
            <POSInner />
        </TerminalProvider>
    );
}
