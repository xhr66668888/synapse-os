'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Home, Search, ArrowLeft, Check } from 'lucide-react';

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
    {
        id: '1',
        name: '宫保鸡丁',
        name_en: 'Kung Pao Chicken',
        description: '经典川菜，香辣可口',
        price: 48,
        image_url: '/assets/dish1.jpg',
        category: '热菜',
        popular: true
    },
    {
        id: '2',
        name: '麻婆豆腐',
        name_en: 'Mapo Tofu',
        description: '麻辣鲜香，下饭佳品',
        price: 32,
        image_url: '/assets/dish2.jpg',
        category: '热菜',
        popular: true
    },
    {
        id: '3',
        name: '糖醋里脊',
        name_en: 'Sweet & Sour Pork',
        description: '外酥里嫩，酸甜可口',
        price: 42,
        image_url: '/assets/dish3.jpg',
        category: '热菜'
    },
    {
        id: '4',
        name: '青椒肉丝',
        name_en: 'Shredded Pork with Green Pepper',
        description: '家常菜，营养丰富',
        price: 36,
        image_url: '/assets/dish4.jpg',
        category: '热菜'
    },
];

const categories = ['推荐', '热菜', '凉菜', '主食', '汤类', '饮料'];

export default function KioskPage() {
    const [selectedCategory, setSelectedCategory] = useState('推荐');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [orderComplete, setOrderComplete] = useState(false);
    const [orderNumber, setOrderNumber] = useState('');
    const [language, setLanguage] = useState<'zh' | 'en'>('zh');
    
    // 闲置计时器
    const [idleTime, setIdleTime] = useState(0);
    
    useEffect(() => {
        const resetIdle = () => setIdleTime(0);
        const idleTimer = setInterval(() => {
            setIdleTime(prev => prev + 1);
            if (idleTime > 60) { // 60秒无操作返回首页
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
        const existing = cart.find(i => i.id === item.id);
        if (existing) {
            setCart(cart.map(i => 
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ));
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
    };

    const removeFromCart = (itemId: string) => {
        const existing = cart.find(i => i.id === itemId);
        if (existing && existing.quantity > 1) {
            setCart(cart.map(i => 
                i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
            ));
        } else {
            setCart(cart.filter(i => i.id !== itemId));
        }
    };

    const getTotalPrice = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const submitOrder = () => {
        // 模拟订单提交
        const orderNum = `K${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        setOrderNumber(orderNum);
        setOrderComplete(true);
        setCart([]);
        
        // 5秒后返回首页
        setTimeout(() => {
            setOrderComplete(false);
            setShowCart(false);
            setSelectedCategory('推荐');
        }, 5000);
    };

    const filteredItems = selectedCategory === '推荐' 
        ? mockMenuItems.filter(item => item.popular)
        : mockMenuItems.filter(item => item.category === selectedCategory);

    if (orderComplete) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                        <Check className="w-20 h-20 text-white" strokeWidth={3} />
                    </div>
                    <h1 className="text-5xl font-bold text-gray-900 mb-4">订单已提交！</h1>
                    <div className="bg-white rounded-2xl shadow-xl p-8 inline-block">
                        <p className="text-2xl text-gray-600 mb-4">您的取餐号是</p>
                        <p className="text-8xl font-black text-blue-600">{orderNumber}</p>
                    </div>
                    <p className="text-xl text-gray-600 mt-8">请凭取餐号到柜台取餐</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* 顶部导航栏 */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <Home className="w-10 h-10" />
                        <div>
                            <h1 className="text-3xl font-bold">自助点餐</h1>
                            <p className="text-blue-100">Self-Service Ordering</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
                            className="px-6 py-3 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 font-semibold"
                        >
                            {language === 'zh' ? 'English' : '中文'}
                        </button>
                        <button
                            onClick={() => setShowCart(true)}
                            className="relative px-8 py-3 bg-yellow-500 hover:bg-yellow-600 rounded-xl font-bold text-blue-900 flex items-center shadow-lg"
                        >
                            <ShoppingCart className="w-6 h-6 mr-2" />
                            购物车 ({cart.length})
                            {cart.length > 0 && (
                                <span className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* 分类导航 */}
            <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex space-x-4 overflow-x-auto">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-8 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
                                selectedCategory === category
                                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* 菜品网格 */}
            <div className="flex-1 max-w-7xl mx-auto p-8 w-full">
                <div className="grid grid-cols-3 gap-8">
                    {filteredItems.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow"
                        >
                            <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 relative">
                                {item.popular && (
                                    <span className="absolute top-4 left-4 bg-red-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                                        热销
                                    </span>
                                )}
                            </div>
                            <div className="p-6">
                                <h3 className="text-2xl font-bold text-gray-900 mb-1">{item.name}</h3>
                                <p className="text-sm text-gray-500 mb-2">{item.name_en}</p>
                                <p className="text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-3xl font-bold text-blue-600">¥{item.price}</span>
                                    <button
                                        onClick={() => addToCart(item)}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center shadow-lg"
                                    >
                                        <Plus className="w-5 h-5 mr-1" />
                                        添加
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 购物车弹窗 */}
            {showCart && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-8">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 flex justify-between items-center">
                            <div className="flex items-center">
                                <button
                                    onClick={() => setShowCart(false)}
                                    className="mr-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
                                >
                                    <ArrowLeft className="w-8 h-8" />
                                </button>
                                <h2 className="text-3xl font-bold">购物车</h2>
                            </div>
                            <div className="text-3xl font-bold">¥{getTotalPrice()}</div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8">
                            {cart.length === 0 ? (
                                <div className="text-center py-20">
                                    <ShoppingCart className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                                    <p className="text-2xl text-gray-400">购物车是空的</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cart.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-2xl p-6">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
                                                <p className="text-gray-500">{item.name_en}</p>
                                                <p className="text-xl font-bold text-blue-600 mt-2">¥{item.price}</p>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="w-12 h-12 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center"
                                                >
                                                    <Minus className="w-6 h-6" />
                                                </button>
                                                <span className="text-2xl font-bold w-12 text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => addToCart(item)}
                                                    className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center"
                                                >
                                                    <Plus className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {cart.length > 0 && (
                            <div className="border-t p-8">
                                <button
                                    onClick={submitOrder}
                                    className="w-full py-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl text-2xl font-bold shadow-lg"
                                >
                                    确认下单 - ¥{getTotalPrice()}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
