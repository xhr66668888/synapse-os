/**
 * Supabase API 封装
 * 
 * 替代原有的假数据 API，真正连接 Supabase 数据库
 */

import { supabase } from './supabase';
import type {
    MenuItem,
    MenuCategory,
    Order,
    OrderItem,
    Table,
    Staff,
    CreateOrderRequest,
} from './api';

// ============== 辅助类型 ==============

interface MenuCategoryRow {
    id: string;
    restaurant_id: string;
    name: string;
    sort_order: number;
    created_at: string;
}

interface MenuItemRow {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    is_available: boolean;
    is_featured: boolean;
    created_at: string;
}

interface OrderRow {
    id: string;
    restaurant_id: string;
    order_number: string;
    order_type: string;
    status: string;
    table_number: string | null;
    subtotal: number;
    tax: number;
    tip: number;
    total: number;
    created_at: string;
    order_items?: OrderItemRow[];
}

interface OrderItemRow {
    id: string;
    order_id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes: string | null;
    created_at: string;
}

interface TableRow {
    id: string;
    restaurant_id: string;
    table_number: string;
    capacity: number;
    status: string;
    section: string | null;
    created_at: string;
}

interface StaffRow {
    id: string;
    restaurant_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    hourly_rate: number;
    is_active: boolean;
    created_at: string;
}

// ============== Supabase API ==============

export const supabaseApi = {
    // ============ 餐厅 ============

    async getRestaurant(restaurantId: string) {
        const { data, error } = await supabase
            .from('restaurants')
            .select('*')
            .eq('id', restaurantId)
            .single();

        if (error) throw error;
        return data;
    },

    // ============ 菜单分类 ============

    async getMenuCategories(restaurantId: string): Promise<MenuCategory[]> {
        const { data, error } = await supabase
            .from('menu_categories')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('sort_order');

        if (error) throw error;
        return (data || []).map((row: MenuCategoryRow) => ({
            id: row.id,
            name: row.name,
            restaurant_id: row.restaurant_id,
        }));
    },

    async getMenuCategoriesWithItems(restaurantId: string) {
        const { data, error } = await supabase
            .from('menu_categories')
            .select(`
        *,
        menu_items (*)
      `)
            .eq('restaurant_id', restaurantId)
            .order('sort_order');

        if (error) throw error;
        return data;
    },

    // ============ 菜品 ============

    async getMenuItems(restaurantId: string, categoryId?: string): Promise<MenuItem[]> {
        let query = supabase
            .from('menu_items')
            .select(`
        *,
        menu_categories!inner(restaurant_id)
      `)
            .eq('menu_categories.restaurant_id', restaurantId);

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description || '',
            price: row.price,
            image_url: row.image_url,
            is_available: row.is_available,
            is_featured: row.is_featured,
            category_id: row.category_id,
        }));
    },

    async toggleItemAvailability(itemId: string, isAvailable: boolean) {
        const { data, error } = await supabase
            .from('menu_items')
            .update({ is_available: isAvailable })
            .eq('id', itemId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ============ 订单 ============

    async getOrders(restaurantId: string, status?: string): Promise<Order[]> {
        let query = supabase
            .from('orders')
            .select(`
        *,
        order_items (*)
      `)
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((row: OrderRow) => ({
            id: row.id,
            order_number: row.order_number,
            order_type: row.order_type as Order['order_type'],
            status: row.status as Order['status'],
            subtotal: row.subtotal,
            tax: row.tax,
            tip: row.tip,
            total: row.total,
            table_number: row.table_number || undefined,
            items: (row.order_items || []).map((item: OrderItemRow) => ({
                id: item.id,
                menu_item_id: item.menu_item_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                notes: item.notes || undefined,
            })),
            created_at: row.created_at,
        }));
    },

    async getOrder(orderId: string): Promise<Order | null> {
        const { data, error } = await supabase
            .from('orders')
            .select(`
        *,
        order_items (*)
      `)
            .eq('id', orderId)
            .single();

        if (error) throw error;
        if (!data) return null;

        const row = data as OrderRow;
        return {
            id: row.id,
            order_number: row.order_number,
            order_type: row.order_type as Order['order_type'],
            status: row.status as Order['status'],
            subtotal: row.subtotal,
            tax: row.tax,
            tip: row.tip,
            total: row.total,
            table_number: row.table_number || undefined,
            items: (row.order_items || []).map((item: OrderItemRow) => ({
                id: item.id,
                menu_item_id: item.menu_item_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                notes: item.notes || undefined,
            })),
            created_at: row.created_at,
        };
    },

    async createOrder(data: CreateOrderRequest): Promise<Order> {
        // 生成订单号
        const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
        const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
        const tax = subtotal * 0.08;
        const total = subtotal + tax + (data.tip || 0);

        // 创建订单
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                restaurant_id: data.restaurant_id,
                order_number: orderNumber,
                order_type: data.order_type,
                table_number: data.table_number,
                subtotal,
                tax,
                tip: data.tip || 0,
                total,
                status: 'pending',
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 创建订单项
        const orderItems = data.items.map(item => ({
            order_id: order.id,
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.quantity * item.unit_price,
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        return this.getOrder(order.id) as Promise<Order>;
    },

    async updateOrderStatus(orderId: string, status: string): Promise<Order> {
        const { error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', orderId);

        if (error) throw error;
        return this.getOrder(orderId) as Promise<Order>;
    },

    // ============ 餐桌 ============

    async getTables(restaurantId: string): Promise<Table[]> {
        const { data, error } = await supabase
            .from('tables')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('table_number');

        if (error) throw error;

        return (data || []).map((row: TableRow) => ({
            id: row.id,
            table_number: row.table_number,
            capacity: row.capacity,
            status: row.status as Table['status'],
            section: row.section || undefined,
        }));
    },

    async updateTableStatus(tableId: string, status: string): Promise<Table> {
        const { data, error } = await supabase
            .from('tables')
            .update({ status })
            .eq('id', tableId)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            table_number: data.table_number,
            capacity: data.capacity,
            status: data.status as Table['status'],
            section: data.section || undefined,
        };
    },

    async getTableStats(restaurantId: string) {
        const { data, error } = await supabase
            .from('tables')
            .select('status')
            .eq('restaurant_id', restaurantId);

        if (error) throw error;

        const tables = data || [];
        return {
            total: tables.length,
            available: tables.filter(t => t.status === 'available').length,
            occupied: tables.filter(t => t.status === 'occupied').length,
            reserved: tables.filter(t => t.status === 'reserved').length,
            cleaning: tables.filter(t => t.status === 'cleaning').length,
        };
    },

    // ============ 员工 ============

    async getStaff(restaurantId: string): Promise<Staff[]> {
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('name');

        if (error) throw error;

        return (data || []).map((row: StaffRow) => ({
            id: row.id,
            name: row.name,
            email: row.email || undefined,
            phone: row.phone || undefined,
            role: row.role,
            hourly_rate: row.hourly_rate,
            is_active: row.is_active,
        }));
    },

    async getStaffStats(restaurantId: string) {
        const { data, error } = await supabase
            .from('staff')
            .select('role')
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true);

        if (error) throw error;

        const staff = data || [];
        return {
            total: staff.length,
            manager: staff.filter(s => s.role === 'manager').length,
            server: staff.filter(s => s.role === 'server').length,
            chef: staff.filter(s => s.role === 'chef').length,
            cashier: staff.filter(s => s.role === 'cashier').length,
            host: staff.filter(s => s.role === 'host').length,
        };
    },

    // ============ 实时订阅 ============

    subscribeToOrders(restaurantId: string, callback: (payload: any) => void) {
        return supabase
            .channel(`orders:${restaurantId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `restaurant_id=eq.${restaurantId}`,
            }, callback)
            .subscribe();
    },

    subscribeToTables(restaurantId: string, callback: (payload: any) => void) {
        return supabase
            .channel(`tables:${restaurantId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tables',
                filter: `restaurant_id=eq.${restaurantId}`,
            }, callback)
            .subscribe();
    },

    // ============ 健康检查 ============

    async healthCheck() {
        try {
            const { data, error } = await supabase
                .from('restaurants')
                .select('id')
                .limit(1);

            return {
                connected: !error,
                error: error?.message
            };
        } catch (e) {
            return {
                connected: false,
                error: String(e)
            };
        }
    },
};

// 默认导出
export default supabaseApi;
