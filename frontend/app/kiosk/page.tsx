'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Home, ArrowLeft, Check } from 'lucide-react';
import { TerminalProvider } from '@/lib/terminal-context';
import { useAudio } from '@/lib/audio';

interface MenuItem {
    id: string;
    name: string;
    name_en?: string;
    description: string;
    price: number;
    image_url: string;
    category: string;
    popular?: boolean;
}

interface CartItem extends MenuItem {
    quantity: number;
}

const mockMenuItems: MenuItem[] = [
    { id: '1', name: '宫保鸡丁', name_en: 'Kung Pao Chicken', description: '经典川菜，香辣可口', price: 48, image_url: '/assets/dish1.jpg', category: '热菜', popular: true },
    { id: '2', name: '麻婆豆腐', name_en: 'Mapo Tofu', description: '麻辣鲜香，下饭佳品', price: 32, image_url: '/assets/dish2.jpg', category: '热菜', popular: true },
    { id: '3', name: '糖醋里脊', name_en: 'Sweet & Sour Pork', description: '外酥里嫩，酸甜可口', price: 42, image_url: '/assets/dish3.jpg', category: '热菜' },
    { id: '4', name: '青椒肉丝', name_en: 'Shredded Pork with Green Pepper', description: '家常菜，营养丰富', price: 36, image_url: '/assets/dish4.jpg', category: '热菜' },
];

const categories = ['推荐', '热菜', '凉菜', '主食', '汤类', '饮料'];

function KioskInner() {
    const [selectedCategory, setSelectedCategory] = useState('推荐');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [orderComplete, setOrderComplete] = useState(false);
    const [orderNumber, setOrderNumber] = useState('');
    const [language, setLanguage] = useState<'zh' | 'en'>('zh');
    const [idleTime, setIdleTime] = useState(0);
    const { playClick, playSuccess, speak } = useAudio();

    useEffect(() => {
        const resetIdle = () => setIdleTime(0);
        const idleTimer = setInterval(() => {
            setIdleTime(prev => prev + 1);
            if (idleTime > 60) {
                setCart([]);
                setShowCart(false);
                setSelectedCategory('推荐');
                setIdleTime(0);
            }
        }, 1000);

        window.addEventListener('click', resetIdle);
        window.addEventListener('touchstart', resetIdle);

        return () => {
            clearInterval(idleTimer);
            window.removeEventListener('click', resetIdle);
            window.removeEventListener('touchstart', resetIdle);
        };
    }, [idleTime]);

    const addToCart = (item: MenuItem) => {
        playClick();
        const existing = cart.find(i => i.id === item.id);
        if (existing) {
            setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
    };

    const removeFromCart = (itemId: string) => {
        playClick();
        const existing = cart.find(i => i.id === itemId);
        if (existing && existing.quantity > 1) {
            setCart(cart.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i));
        } else {
            setCart(cart.filter(i => i.id !== itemId));
        }
    };

    const getTotalPrice = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const submitOrder = () => {
        const orderNum = `K${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        setOrderNumber(orderNum);
        setOrderComplete(true);
        setCart([]);
        playSuccess();
        speak(`您的订单已提交，取餐号是 ${orderNum}`);

        setTimeout(() => {
            setOrderComplete(false);
            setShowCart(false);
            setSelectedCategory('推荐');
        }, 5000);
    };

    const filteredItems = selectedCategory === '推荐'
        ? mockMenuItems.filter(item => item.popular)
        : mockMenuItems.filter(item => item.category === selectedCategory);

    // Idle progress bar (last 15 seconds)
    const idleProgress = idleTime > 45 ? Math.min((idleTime - 45) / 15, 1) : 0;

    if (orderComplete) {
        return (
            <div className="min-h-screen bg-surface-base flex items-center justify-center">
                <div className="text-center">
                    <div className="w-24 h-24 bg-success rounded-sm flex items-center justify-center mx-auto mb-6">
                        <Check className="w-16 h-16 text-success-fg" strokeWidth={3} />
                    </div>
                    <h1 className="text-4xl font-bold text-text-primary mb-4">订单已提交</h1>
                    <div className="card-base p-8 inline-block">
                        <p className="text-lg text-text-secondary mb-3">您的取餐号是</p>
                        <p className="text-7xl font-black font-mono text-text-primary">{orderNumber}</p>
                    </div>
                    <p className="text-lg text-text-secondary mt-6">请凭取餐号到柜台取餐</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-base flex flex-col">
            {/* Header */}
            <div className="bg-action text-action-fg p-5">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Home className="w-8 h-8" />
                        <div>
                            <h1 className="text-2xl font-bold">自助点餐</h1>
                            <p className="text-sm opacity-70">Self-Service Ordering</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
                            className="px-5 py-2.5 bg-surface-dark-3 rounded-sm font-bold text-sm"
                        >
                            {language === 'zh' ? 'English' : '中文'}
                        </button>
                        <button
                            onClick={() => setShowCart(true)}
                            className="relative px-6 py-2.5 bg-warning text-warning-fg rounded-sm font-bold flex items-center gap-2"
                            style={{ minHeight: '48px' }}
                        >
                            <ShoppingCart className="w-5 h-5" />
                            购物车 ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                        </button>
                    </div>
                </div>
            </div>

            {/* Categories */}
            <div className="bg-surface-raised border-b border-border sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-5 py-3 flex gap-2 overflow-x-auto">
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => { setSelectedCategory(category); playClick(); }}
                            className={`px-6 py-3 rounded-sm font-bold whitespace-nowrap transition-colors ${
                                selectedCategory === category
                                    ? 'bg-action text-action-fg'
                                    : 'bg-surface-sunken text-text-secondary'
                            }`}
                            style={{ minHeight: '48px' }}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Grid */}
            <div className="flex-1 max-w-7xl mx-auto p-6 w-full">
                <div className="grid grid-cols-3 gap-5">
                    {filteredItems.map(item => (
                        <div key={item.id} className="card-base overflow-hidden">
                            <div className="h-40 bg-surface-sunken relative">
                                {item.popular && (
                                    <span className="absolute top-3 left-3 badge-danger">热销</span>
                                )}
                            </div>
                            <div className="p-5">
                                <h3 className="text-xl font-bold text-text-primary mb-1">{item.name}</h3>
                                <p className="text-xs text-text-muted mb-1">{item.name_en}</p>
                                <p className="text-sm text-text-secondary mb-4">{item.description}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-bold font-mono tabular-nums text-warning">¥{item.price}</span>
                                    <button
                                        onClick={() => addToCart(item)}
                                        className="btn-action"
                                        style={{ minHeight: '48px', minWidth: '48px' }}
                                    >
                                        <Plus className="w-5 h-5" /> 添加
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Idle progress bar */}
            {idleProgress > 0 && (
                <div className="fixed bottom-0 left-0 right-0 h-1 bg-surface-sunken">
                    <div className="h-full bg-warning transition-all duration-1000" style={{ width: `${idleProgress * 100}%` }} />
                </div>
            )}

            {/* Cart Modal */}
            {showCart && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
                    <div className="bg-surface-raised rounded-md w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-action text-action-fg p-6 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setShowCart(false)} className="p-2 hover:bg-surface-dark-3 rounded-sm">
                                    <ArrowLeft className="w-6 h-6" />
                                </button>
                                <h2 className="text-2xl font-bold">购物车</h2>
                            </div>
                            <div className="text-2xl font-bold font-mono tabular-nums">¥{getTotalPrice()}</div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {cart.length === 0 ? (
                                <div className="text-center py-16">
                                    <ShoppingCart className="w-16 h-16 text-text-disabled mx-auto mb-3" />
                                    <p className="text-lg text-text-muted">购物车是空的</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex items-center justify-between bg-surface-sunken rounded-sm p-4">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-text-primary">{item.name}</h3>
                                                <p className="text-sm text-text-muted">{item.name_en}</p>
                                                <p className="text-lg font-bold font-mono tabular-nums text-text-primary mt-1">¥{item.price}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => removeFromCart(item.id)}
                                                    className="w-12 h-12 bg-border rounded-sm flex items-center justify-center hover:bg-border-strong"
                                                    style={{ minWidth: '48px', minHeight: '48px' }}>
                                                    <Minus className="w-5 h-5" />
                                                </button>
                                                <span className="text-xl font-bold font-mono tabular-nums w-10 text-center">{item.quantity}</span>
                                                <button onClick={() => addToCart(item)}
                                                    className="w-12 h-12 bg-action text-action-fg rounded-sm flex items-center justify-center"
                                                    style={{ minWidth: '48px', minHeight: '48px' }}>
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="border-t border-border p-6">
                                <button
                                    onClick={submitOrder}
                                    className="w-full btn-success text-xl"
                                    style={{ minHeight: '64px' }}
                                >
                                    确认下单 - <span className="font-mono tabular-nums">¥{getTotalPrice()}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function KioskPage() {
    return (
        <TerminalProvider terminal="kiosk">
            <KioskInner />
        </TerminalProvider>
    );
}
