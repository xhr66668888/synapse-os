import { create } from 'zustand';
import type { Order, OrderItem, MenuItem } from '../types/database';

// 购物车商品
interface CartItem {
    menuItem: MenuItem;
    quantity: number;
    notes?: string;
    tasteModifiers?: {
        salt?: number;
        spice?: number;
        oil?: number;
        sweetness?: number;
    };
}

// 订单 Store
interface OrderStore {
    // 购物车
    cart: CartItem[];
    orderType: 'dine_in' | 'takeout' | 'delivery';
    tableNumber: string;
    customerNotes: string;
    tipPercent: number;

    // 操作
    addToCart: (item: MenuItem, quantity?: number) => void;
    removeFromCart: (menuItemId: string) => void;
    updateQuantity: (menuItemId: string, quantity: number) => void;
    updateItemNotes: (menuItemId: string, notes: string) => void;
    updateTasteModifiers: (menuItemId: string, modifiers: CartItem['tasteModifiers']) => void;
    setOrderType: (type: 'dine_in' | 'takeout' | 'delivery') => void;
    setTableNumber: (table: string) => void;
    setCustomerNotes: (notes: string) => void;
    setTipPercent: (percent: number) => void;
    clearCart: () => void;

    // 计算
    getSubtotal: () => number;
    getTax: () => number;
    getTip: () => number;
    getTotal: () => number;
    getItemCount: () => number;
}

const TAX_RATE = 0.0875; // 8.75% 税率

export const useOrderStore = create<OrderStore>((set, get) => ({
    cart: [],
    orderType: 'dine_in',
    tableNumber: '',
    customerNotes: '',
    tipPercent: 15,

    addToCart: (item, quantity = 1) => {
        set((state) => {
            const existingIndex = state.cart.findIndex(
                (c) => c.menuItem.id === item.id
            );

            if (existingIndex >= 0) {
                const newCart = [...state.cart];
                newCart[existingIndex].quantity += quantity;
                return { cart: newCart };
            }

            return {
                cart: [...state.cart, { menuItem: item, quantity }],
            };
        });
    },

    removeFromCart: (menuItemId) => {
        set((state) => ({
            cart: state.cart.filter((c) => c.menuItem.id !== menuItemId),
        }));
    },

    updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
            get().removeFromCart(menuItemId);
            return;
        }

        set((state) => ({
            cart: state.cart.map((c) =>
                c.menuItem.id === menuItemId ? { ...c, quantity } : c
            ),
        }));
    },

    updateItemNotes: (menuItemId, notes) => {
        set((state) => ({
            cart: state.cart.map((c) =>
                c.menuItem.id === menuItemId ? { ...c, notes } : c
            ),
        }));
    },

    updateTasteModifiers: (menuItemId, modifiers) => {
        set((state) => ({
            cart: state.cart.map((c) =>
                c.menuItem.id === menuItemId ? { ...c, tasteModifiers: modifiers } : c
            ),
        }));
    },

    setOrderType: (type) => set({ orderType: type }),
    setTableNumber: (table) => set({ tableNumber: table }),
    setCustomerNotes: (notes) => set({ customerNotes: notes }),
    setTipPercent: (percent) => set({ tipPercent: percent }),

    clearCart: () => set({
        cart: [],
        tableNumber: '',
        customerNotes: '',
        tipPercent: 15,
    }),

    getSubtotal: () => {
        return get().cart.reduce(
            (sum, item) => sum + item.menuItem.price * item.quantity,
            0
        );
    },

    getTax: () => {
        return get().getSubtotal() * TAX_RATE;
    },

    getTip: () => {
        return get().getSubtotal() * (get().tipPercent / 100);
    },

    getTotal: () => {
        return get().getSubtotal() + get().getTax() + get().getTip();
    },

    getItemCount: () => {
        return get().cart.reduce((sum, item) => sum + item.quantity, 0);
    },
}));
