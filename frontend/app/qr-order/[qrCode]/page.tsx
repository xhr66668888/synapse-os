'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ShoppingCart, Plus, Minus, Check } from 'lucide-react';

interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    category_name: string;
    is_available: boolean;
}

interface CartItem extends MenuItem {
    quantity: number;
    notes?: string;
}

interface TableInfo {
    id: string;
    table_number: string;
    restaurant_id: string;
    section?: string;
}

export default function QROrderPage() {
    const params = useParams();
    const qrCode = params.qrCode as string;
    
    const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCart, setShowCart] = useState(false);
    const [orderSubmitted, setOrderSubmitted] = useState(false);

    useEffect(() => {
        loadTableAndMenu();
    }, [qrCode]);

    const loadTableAndMenu = async () => {
        try {
            // 获取桌位信息
            const tableRes = await fetch(`/api/v1/tables/qr/${qrCode}`);
            if (!tableRes.ok) throw new Error('无效的二维码');
            const table = await tableRes.json();
            setTableInfo(table);

            // 获取菜单
            const menuRes = await fetch(`/api/v1/menu/?restaurant_id=${table.restaurant_id}`);
            const menu = await menuRes.json();
            setMenuItems(menu);
        } catch (error) {
            console.error('加载失败:', error);
            alert('二维码无效或已过期');
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (item: MenuItem) => {
        const existingItem = cart.find(i => i.id === item.id);
        if (existingItem) {
            setCart(cart.map(i => 
                i.id === item.id 
                    ? { ...i, quantity: i.quantity + 1 }
                    : i
            ));
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
    };

    const removeFromCart = (itemId: string) => {
        const existingItem = cart.find(i => i.id === itemId);
        if (existingItem && existingItem.quantity > 1) {
            setCart(cart.map(i => 
                i.id === itemId 
                    ? { ...i, quantity: i.quantity - 1 }
                    : i
            ));
        } else {
            setCart(cart.filter(i => i.id !== itemId));
        }
    };

    const getTotalPrice = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const submitOrder = async () => {
        if (cart.length === 0) {
            alert('购物车为空');
            return;
        }

        try {
            const orderData = {
                restaurant_id: tableInfo?.restaurant_id,
                table_number: tableInfo?.table_number,
                order_type: 'dine_in',
                items: cart.map(item => ({
                    menu_item_id: item.id,
                    quantity: item.quantity,
                    notes: item.notes || ''
                }))
            };

            const response = await fetch('/api/v1/orders/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (response.ok) {
                setOrderSubmitted(true);
                setCart([]);
                setTimeout(() => {
                    setOrderSubmitted(false);
                    setShowCart(false);
                }, 3000);
            } else {
                throw new Error('提交订单失败');
            }
        } catch (error) {
            console.error('提交失败:', error);
            alert('订单提交失败，请重试');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">加载中...</p>
                </div>
            </div>
        );
    }

    if (orderSubmitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">订单已提交！</h2>
                    <p className="text-gray-600">您的订单正在准备中，请稍候...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 头部 */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 shadow-lg sticky top-0 z-10">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl font-bold">扫码点餐</h1>
                    <p className="text-blue-100 mt-1">
                        桌号: {tableInfo?.table_number} 
                        {tableInfo?.section && ` · ${tableInfo.section}`}
                    </p>
                </div>
            </div>

            {/* 菜单列表 */}
            <div className="max-w-4xl mx-auto p-4 pb-24">
                <div className="grid gap-4">
                    {menuItems.map((item) => (
                        <div 
                            key={item.id}
                            className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                        >
                            <div className="flex">
                                {item.image_url && (
                                    <img 
                                        src={item.image_url}
                                        alt={item.name}
                                        className="w-24 h-24 object-cover"
                                    />
                                )}
                                <div className="flex-1 p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">{item.name}</h3>
                                            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                                            <p className="text-lg font-bold text-blue-600 mt-2">¥{item.price.toFixed(2)}</p>
                                        </div>
                                        <button
                                            onClick={() => addToCart(item)}
                                            disabled={!item.is_available}
                                            className={`ml-4 p-2 rounded-full ${
                                                item.is_available
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 购物车按钮 */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-20">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div className="text-left">
                            <p className="text-sm text-gray-600">{cart.length} 件商品</p>
                            <p className="text-xl font-bold text-gray-900">¥{getTotalPrice().toFixed(2)}</p>
                        </div>
                        <button
                            onClick={() => setShowCart(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold flex items-center shadow-lg"
                        >
                            <ShoppingCart className="w-5 h-5 mr-2" />
                            查看购物车
                        </button>
                    </div>
                </div>
            )}

            {/* 购物车弹窗 */}
            {showCart && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-end sm:items-center justify-center">
                    <div className="bg-white w-full sm:max-w-2xl sm:rounded-t-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold">购物车</h2>
                            <button 
                                onClick={() => setShowCart(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="p-4">
                            {cart.map((item) => (
                                <div key={item.id} className="flex items-center justify-between py-3 border-b">
                                    <div className="flex-1">
                                        <h3 className="font-semibold">{item.name}</h3>
                                        <p className="text-blue-600 font-bold">¥{item.price.toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="font-semibold w-8 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => addToCart(item)}
                                            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            
                            <div className="mt-6 space-y-2">
                                <div className="flex justify-between text-lg">
                                    <span className="font-semibold">小计</span>
                                    <span className="font-bold text-gray-900">¥{getTotalPrice().toFixed(2)}</span>
                                </div>
                                <button
                                    onClick={submitOrder}
                                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-xl font-bold text-lg shadow-lg"
                                >
                                    提交订单
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
