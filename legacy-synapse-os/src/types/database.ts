// 数据库类型定义 - 与 Supabase Schema 同步

export type LicenseType = 'LITE' | 'STANDARD' | 'GOLD';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type OrderType = 'dine_in' | 'takeout' | 'delivery';

// 餐厅/门店
export interface Restaurant {
    id: string;
    name: string;
    address: string;
    phone: string;
    license_type: LicenseType;
    robot_enabled: boolean;
    created_at: string;
    updated_at: string;
}

// 用户
export interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    role: 'admin' | 'manager' | 'staff' | 'customer';
    restaurant_id?: string;
    created_at: string;
}

// 菜单分类
export interface MenuCategory {
    id: string;
    restaurant_id: string;
    name: string;
    sort_order: number;
    is_active: boolean;
}

// 菜品
export interface MenuItem {
    id: string;
    restaurant_id: string;
    category_id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    is_available: boolean;
    recipe_id?: string; // 机器人菜谱 ID
    prep_time_minutes: number;
    sort_order: number;
    created_at: string;
}

// 订单
export interface Order {
    id: string;
    restaurant_id: string;
    customer_id?: string;
    order_number: string;
    order_type: OrderType;
    status: OrderStatus;
    subtotal: number;
    tax: number;
    tip: number;
    total: number;
    notes?: string;
    table_number?: string;
    delivery_address?: string;
    delivery_platform?: 'doordash' | 'ubereats' | 'grubhub';
    created_at: string;
    updated_at: string;
}

// 订单明细
export interface OrderItem {
    id: string;
    order_id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes?: string;
    taste_modifiers?: TasteModifier; // Gold 专属
}

// 口味偏好 (Gold 专属)
export interface TastePreference {
    id: string;
    user_id: string;
    salt_level: number;   // 1-5
    spice_level: number;  // 1-5
    oil_level: number;    // 1-5
    sweetness: number;    // 1-5
    updated_at: string;
}

// 口味修改器 - 订单级别的临时口味调整
export interface TasteModifier {
    salt?: number;   // -2 到 +2
    spice?: number;
    oil?: number;
    sweetness?: number;
}

// 机器人指令
export interface RobotCommand {
    id: string;
    order_id: string;
    order_item_id: string;
    menu_item_id: string;
    recipe_id: string;
    gcode_params?: GCodeParams;
    status: 'pending' | 'sent' | 'cooking' | 'done' | 'error';
    sent_at?: string;
    completed_at?: string;
    error_message?: string;
}

// G-Code 参数 (机器人控制)
export interface GCodeParams {
    temperature?: number;     // 油温
    cook_time?: number;       // 烹饪时长 (秒)
    stir_frequency?: number;  // 翻炒频率
    salt_modifier?: number;   // 盐量修正
    oil_modifier?: number;    // 油量修正
    // ... 其他参数待机器人厂家提供
}

// Supabase Database 类型
export interface Database {
    public: {
        Tables: {
            restaurants: { Row: Restaurant; Insert: Omit<Restaurant, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Restaurant> };
            users: { Row: User; Insert: Omit<User, 'id' | 'created_at'>; Update: Partial<User> };
            menu_categories: { Row: MenuCategory; Insert: Omit<MenuCategory, 'id'>; Update: Partial<MenuCategory> };
            menu_items: { Row: MenuItem; Insert: Omit<MenuItem, 'id' | 'created_at'>; Update: Partial<MenuItem> };
            orders: { Row: Order; Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Order> };
            order_items: { Row: OrderItem; Insert: Omit<OrderItem, 'id'>; Update: Partial<OrderItem> };
            taste_preferences: { Row: TastePreference; Insert: Omit<TastePreference, 'id' | 'updated_at'>; Update: Partial<TastePreference> };
            robot_commands: { Row: RobotCommand; Insert: Omit<RobotCommand, 'id'>; Update: Partial<RobotCommand> };
        };
    };
}
