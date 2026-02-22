'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ShoppingCart, Plus, Minus, Check, X } from 'lucide-react';
import { TerminalProvider } from '@/lib/terminal-context';
import { useAudio } from '@/lib/audio';
import { StateBadge } from '@/components/ui';

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

function QROrderInner() {
    const params = useParams();
    const qrCode = params.qrCode as string;

    const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCart, setShowCart] = useState(false);
    const [orderSubmitted, setOrderSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { playClick, playSuccess } = useAudio();

    useEffect(() => {
        loadTableAndMenu();
    }, [qrCode]);

    const loadTableAndMenu = async () => {
        try {
            const tableRes = await fetch(`/api/v1/tables/qr/${qrCode}`);
            if (!tableRes.ok) throw new Error('无效的二维码');
            const table = await tableRes.json();
            setTableInfo(table);

            const menuRes = await fetch(`/api/v1/menu/?restaurant_id=${table.restaurant_id}`);
            const menu = await menuRes.json();
            setMenuItems(menu);
        } catch {
            setError('二维码无效或已过期');
        } finally {
            setLoading(false);
        }
    };

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

    const submitOrder = async () => {
        if (cart.length === 0) {
            setError('购物车为空');
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
                playSuccess();
                setTimeout(() => {
                    setOrderSubmitted(false);
                    setShowCart(false);
                }, 3000);
            } else {
                throw new Error('提交订单失败');
            }
        } catch {
            setError('订单提交失败，请重试');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-base flex items-center justify-center">
                <p className="text-text-muted text-sm">加载中...</p>
            </div>
        );
    }

    if (orderSubmitted) {
        return (
            <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
                <div className="card-base p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-success rounded-sm flex items-center justify-center mx-auto mb-4">
                        <Check className="w-10 h-10 text-success-fg" />
                    </div>
                    <h2 className="text-xl font-bold text-text-primary mb-2">订单已提交</h2>
                    <p className="text-sm text-text-secondary">您的订单正在准备中，请稍候...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-base">
            {/* Error banner */}
            {error && (
                <div className="bg-danger text-danger-fg px-4 py-2 text-sm font-bold flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Header */}
            <div className="bg-action text-action-fg p-4 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-lg font-bold">扫码点餐</h1>
                    <p className="text-sm opacity-70 font-mono">
                        桌号: <span className="text-xl font-bold">{tableInfo?.table_number}</span>
                        {tableInfo?.section && ` · ${tableInfo.section}`}
                    </p>
                </div>
            </div>

            {/* Menu */}
            <div className="max-w-4xl mx-auto p-4 pb-24">
                <div className="grid gap-3">
                    {menuItems.map(item => (
                        <div key={item.id} className="card-flat overflow-hidden">
                            <div className="flex">
                                {item.image_url && (
                                    <img src={item.image_url} alt={item.name} className="w-24 h-24 object-cover" />
                                )}
                                <div className="flex-1 p-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-text-primary">{item.name}</h3>
                                            <p className="text-xs text-text-muted mt-0.5">{item.description}</p>
                                            <p className="text-base font-bold font-mono tabular-nums text-text-primary mt-1.5">¥{item.price.toFixed(2)}</p>
                                        </div>
                                        <button
                                            onClick={() => addToCart(item)}
                                            disabled={!item.is_available}
                                            className={`ml-3 w-10 h-10 rounded-sm flex items-center justify-center ${
                                                item.is_available
                                                    ? 'bg-action text-action-fg'
                                                    : 'bg-surface-sunken text-text-disabled cursor-not-allowed'
                                            }`}
                                            style={{ minWidth: '44px', minHeight: '44px' }}
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

            {/* Bottom bar */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-surface-raised border-t border-border p-3 z-20">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div>
                            <p className="text-xs text-text-muted">{cart.reduce((s, i) => s + i.quantity, 0)} 件</p>
                            <p className="text-lg font-bold font-mono tabular-nums text-text-primary">¥{getTotalPrice().toFixed(2)}</p>
                        </div>
                        <button
                            onClick={() => setShowCart(true)}
                            className="btn-success"
                            style={{ minHeight: '48px' }}
                        >
                            <ShoppingCart className="w-5 h-5" /> 结算
                        </button>
                    </div>
                </div>
            )}

            {/* Cart sheet */}
            {showCart && (
                <div className="fixed inset-0 bg-black/50 z-30 flex items-end sm:items-center justify-center">
                    <div className="bg-surface-raised w-full sm:max-w-2xl rounded-t-md sm:rounded-md max-h-[80vh] overflow-y-auto">
                        <div className="sticky top-0 bg-surface-raised border-b border-border p-4 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-text-primary">购物车</h2>
                            <button onClick={() => setShowCart(false)} className="p-1.5 hover:bg-surface-sunken rounded-xs">
                                <X className="w-5 h-5 text-text-muted" />
                            </button>
                        </div>

                        <div className="p-4">
                            {cart.map(item => (
                                <div key={item.id} className="flex items-center justify-between py-3 border-b border-border-light">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-sm text-text-primary">{item.name}</h3>
                                        <p className="font-bold font-mono tabular-nums text-sm text-text-primary">¥{item.price.toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => removeFromCart(item.id)}
                                            className="w-9 h-9 rounded-sm bg-surface-sunken flex items-center justify-center hover:bg-border"
                                            style={{ minWidth: '36px', minHeight: '36px' }}>
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="font-bold font-mono tabular-nums w-8 text-center">{item.quantity}</span>
                                        <button onClick={() => addToCart(item)}
                                            className="w-9 h-9 rounded-sm bg-action text-action-fg flex items-center justify-center"
                                            style={{ minWidth: '36px', minHeight: '36px' }}>
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <div className="mt-5 space-y-3">
                                <div className="flex justify-between text-base">
                                    <span className="font-bold text-text-secondary">小计</span>
                                    <span className="font-bold font-mono tabular-nums text-text-primary">¥{getTotalPrice().toFixed(2)}</span>
                                </div>
                                <button
                                    onClick={submitOrder}
                                    className="w-full btn-success text-lg"
                                    style={{ minHeight: '52px' }}
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

export default function QROrderPage() {
    return (
        <TerminalProvider terminal="qr-order">
            <QROrderInner />
        </TerminalProvider>
    );
}
