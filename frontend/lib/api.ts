/**
 * API 客户端
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    setToken(token: string | null) {
        this.token = token;
    }

    private async request<T>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<T> {
        const { params, ...fetchOptions } = options;

        // 构建 URL
        let url = `${this.baseUrl}${endpoint}`;
        if (params) {
            const searchParams = new URLSearchParams(params);
            url += `?${searchParams.toString()}`;
        }

        // 设置 Headers
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
        };

        if (this.token) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, {
            ...fetchOptions,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // ============ 菜单 API ============

    async getMenuCategories(restaurantId: string) {
        return this.request<MenuCategoryWithItems[]>('/api/v1/menu/categories', {
            params: { restaurant_id: restaurantId },
        });
    }

    async getMenuItems(restaurantId: string, categoryId?: string) {
        const params: Record<string, string> = { restaurant_id: restaurantId };
        if (categoryId) params.category_id = categoryId;
        return this.request<MenuItem[]>('/api/v1/menu/items', { params });
    }

    async toggleItemAvailability(itemId: string, isAvailable: boolean) {
        return this.request(`/api/v1/menu/items/${itemId}/availability`, {
            method: 'PATCH',
            params: { is_available: String(isAvailable) },
        });
    }

    // ============ 订单 API ============

    async getOrders(restaurantId: string, status?: string) {
        const params: Record<string, string> = { restaurant_id: restaurantId };
        if (status) params.status = status;
        return this.request<OrderSummary[]>('/api/v1/orders/', { params });
    }

    async getOrder(orderId: string) {
        return this.request<Order>(`/api/v1/orders/${orderId}`);
    }

    async createOrder(data: CreateOrderRequest) {
        return this.request<Order>('/api/v1/orders/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateOrderStatus(orderId: string, status: string) {
        return this.request<Order>(`/api/v1/orders/${orderId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    }

    async getKdsOrders(restaurantId: string) {
        return this.request<Order[]>('/api/v1/orders/kds/pending', {
            params: { restaurant_id: restaurantId },
        });
    }

    // ============ 桌位 API ============

    async getTables(restaurantId: string) {
        return this.request<Table[]>('/api/v1/tables/', {
            params: { restaurant_id: restaurantId },
        });
    }

    async updateTableStatus(tableId: string, status: string) {
        return this.request(`/api/v1/tables/${tableId}/status`, {
            method: 'PATCH',
            params: { status },
        });
    }

    async getTableStats(restaurantId: string) {
        return this.request<TableStats>('/api/v1/tables/stats/summary', {
            params: { restaurant_id: restaurantId },
        });
    }

    // ============ 员工 API ============

    async getStaff(restaurantId: string) {
        return this.request<Staff[]>('/api/v1/staff/', {
            params: { restaurant_id: restaurantId },
        });
    }

    async getStaffStats(restaurantId: string) {
        return this.request<StaffStats>('/api/v1/staff/stats/by-role', {
            params: { restaurant_id: restaurantId },
        });
    }

    // ============ 机器人 API ============

    async getPendingRobotItems(restaurantId: string) {
        return this.request<PendingRobotItem[]>('/api/v1/robot/pending-items', {
            params: { restaurant_id: restaurantId },
        });
    }

    async getRobots() {
        return this.request<RobotStatus[]>('/api/v1/robot/robots');
    }

    async pushToRobot(orderItemId: string, robotId: string) {
        return this.request<{ message: string; status: string }>(`/api/v1/robot/push/${orderItemId}`, {
            method: 'POST',
            params: { robot_id: robotId },
        });
    }

    // ============ 修饰符 API ============

    async getModifierGroups(menuItemId: string) {
        return this.request<ModifierGroup[]>('/api/v1/modifiers/groups', {
            params: { menu_item_id: menuItemId },
        });
    }

    async createModifierGroup(data: CreateModifierGroupRequest) {
        return this.request<ModifierGroup>('/api/v1/modifiers/groups', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getMenuItemWithModifiers(itemId: string) {
        return this.request<MenuItemWithModifiers>(`/api/v1/modifiers/menu-items/${itemId}/full`);
    }

    // ============ 支付 API ============

    async processPayment(data: ProcessPaymentRequest) {
        return this.request<ProcessPaymentResponse>('/api/v1/payments/process', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getOrderPayments(orderId: string) {
        return this.request<Payment[]>(`/api/v1/payments/order/${orderId}`);
    }

    async createRefund(data: CreateRefundRequest) {
        return this.request<Refund>('/api/v1/payments/refunds', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getDiscounts(restaurantId: string) {
        return this.request<Discount[]>('/api/v1/payments/discounts', {
            params: { restaurant_id: restaurantId },
        });
    }

    async applyDiscount(orderId: string, discountCode: string) {
        return this.request<ApplyDiscountResponse>('/api/v1/payments/discounts/apply', {
            method: 'POST',
            body: JSON.stringify({ order_id: orderId, discount_code: discountCode }),
        });
    }

    // ============ 现金管理 API ============

    async openCashDrawer(data: OpenCashDrawerRequest) {
        return this.request<CashDrawer>('/api/v1/payments/cash-drawer/open', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async closeCashDrawer(drawerId: string, data: CloseCashDrawerRequest) {
        return this.request<CashDrawer>(`/api/v1/payments/cash-drawer/${drawerId}/close`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getCurrentCashDrawer(restaurantId: string) {
        return this.request<CashDrawer>('/api/v1/payments/cash-drawer/current', {
            params: { restaurant_id: restaurantId },
        });
    }

    async getShiftSummary(drawerId: string) {
        return this.request<ShiftSummary>(`/api/v1/payments/cash-drawer/${drawerId}/summary`);
    }

    // ============ 库存 API ============

    async getIngredients(restaurantId: string, lowStockOnly?: boolean) {
        const params: Record<string, string> = { restaurant_id: restaurantId };
        if (lowStockOnly) params.low_stock_only = 'true';
        return this.request<Ingredient[]>('/api/v1/inventory/ingredients', { params });
    }

    async createIngredient(data: CreateIngredientRequest) {
        return this.request<Ingredient>('/api/v1/inventory/ingredients', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getLowStockAlerts(restaurantId: string) {
        return this.request<LowStockAlert[]>('/api/v1/inventory/alerts/low-stock', {
            params: { restaurant_id: restaurantId },
        });
    }

    async mark86(menuItemId: string, reason?: string) {
        return this.request('/api/v1/inventory/86', {
            method: 'POST',
            body: JSON.stringify({ menu_item_id: menuItemId, reason }),
        });
    }

    async getSuppliers(restaurantId: string) {
        return this.request<Supplier[]>('/api/v1/inventory/suppliers', {
            params: { restaurant_id: restaurantId },
        });
    }

    async getPurchaseOrders(restaurantId: string) {
        return this.request<PurchaseOrder[]>('/api/v1/inventory/purchase-orders', {
            params: { restaurant_id: restaurantId },
        });
    }

    // ============ 排班 API ============

    async getSchedules(restaurantId: string, startDate?: string, endDate?: string) {
        const params: Record<string, string> = { restaurant_id: restaurantId };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        return this.request<Schedule[]>('/api/v1/schedule/schedules', { params });
    }

    async createSchedule(data: CreateScheduleRequest) {
        return this.request<Schedule>('/api/v1/schedule/schedules', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async clockIn(data: ClockInRequest) {
        return this.request<TimeEntry>('/api/v1/schedule/clock-in', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async clockOut(entryId: string) {
        return this.request<TimeEntry>(`/api/v1/schedule/clock-out/${entryId}`, {
            method: 'POST',
        });
    }

    async getTimeEntries(restaurantId: string, staffId?: string) {
        const params: Record<string, string> = { restaurant_id: restaurantId };
        if (staffId) params.staff_id = staffId;
        return this.request<TimeEntry[]>('/api/v1/schedule/time-entries', { params });
    }

    async getTipPools(restaurantId: string) {
        return this.request<TipPool[]>('/api/v1/schedule/tip-pools', {
            params: { restaurant_id: restaurantId },
        });
    }

    async distributeTips(poolId: string, distributedBy: string) {
        return this.request<TipPoolWithDistributions>(`/api/v1/schedule/tip-pools/${poolId}/distribute`, {
            method: 'POST',
            body: JSON.stringify({ distributed_by: distributedBy }),
        });
    }

    // ============ 报表 API ============

    async getPMIXReport(restaurantId: string, startDate: string, endDate: string) {
        return this.request<PMIXReport>('/api/v1/reports/pmix', {
            params: { restaurant_id: restaurantId, start_date: startDate, end_date: endDate },
        });
    }

    async getDailySalesReport(restaurantId: string, reportDate: string) {
        return this.request<DailySalesReport>('/api/v1/reports/sales/daily', {
            params: { restaurant_id: restaurantId, report_date: reportDate },
        });
    }

    async getLaborCostReport(restaurantId: string, startDate: string, endDate: string) {
        return this.request<LaborCostReport>('/api/v1/reports/labor-cost', {
            params: { restaurant_id: restaurantId, start_date: startDate, end_date: endDate },
        });
    }

    async getDashboardMetrics(restaurantId: string) {
        return this.request<DashboardMetrics>('/api/v1/reports/dashboard', {
            params: { restaurant_id: restaurantId },
        });
    }

    async getAuditLogs(restaurantId: string, limit?: number) {
        const params: Record<string, string> = { restaurant_id: restaurantId };
        if (limit) params.limit = String(limit);
        return this.request<AuditLog[]>('/api/v1/reports/audit', { params });
    }

    // ============ 订单扩展 API ============

    async splitOrderBySeats(orderId: string, seats: number[]) {
        return this.request<SplitOrderResponse>(`/api/v1/orders/${orderId}/split/by-seats`, {
            method: 'POST',
            body: JSON.stringify({ seats }),
        });
    }

    async splitOrderByItems(orderId: string, itemIds: string[]) {
        return this.request<SplitOrderResponse>(`/api/v1/orders/${orderId}/split/by-items`, {
            method: 'POST',
            body: JSON.stringify({ item_ids: itemIds }),
        });
    }

    async mergeOrders(orderIds: string[]) {
        return this.request<Order>('/api/v1/orders/merge', {
            method: 'POST',
            body: JSON.stringify({ order_ids: orderIds }),
        });
    }

    async transferTable(orderId: string, newTableNumber: string) {
        return this.request<Order>(`/api/v1/orders/${orderId}/transfer`, {
            method: 'POST',
            body: JSON.stringify({ new_table_number: newTableNumber }),
        });
    }

    async fireCourse(orderId: string, course?: number) {
        return this.request<Order>(`/api/v1/orders/${orderId}/fire`, {
            method: 'POST',
            body: JSON.stringify({ course }),
        });
    }

    async voidOrderItem(orderId: string, itemId: string, reason: string) {
        return this.request<Order>(`/api/v1/orders/${orderId}/items/${itemId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
        });
    }

    // ============ Expo API ============

    async getExpoQueue(restaurantId: string) {
        return this.request<ExpoQueueItem[]>('/api/v1/robot/expo/queue', {
            params: { restaurant_id: restaurantId },
        });
    }

    async getOrderPacing(orderId: string) {
        return this.request<PacingPlan>(`/api/v1/robot/expo/pacing/${orderId}`);
    }

    async markItemReady(itemId: string) {
        return this.request(`/api/v1/robot/expo/item/${itemId}/ready`, {
            method: 'POST',
        });
    }

    async markItemServed(itemId: string) {
        return this.request(`/api/v1/robot/expo/item/${itemId}/served`, {
            method: 'POST',
        });
    }

    // ============ 推荐 API ============

    async getPersonalizedRecommendations(restaurantId: string, customerId?: string) {
        const params: Record<string, string> = { restaurant_id: restaurantId };
        if (customerId) params.customer_id = customerId;
        return this.request<Recommendation[]>('/api/v1/robot/recommendations/personalized', { params });
    }

    async getUpsellRecommendations(restaurantId: string, currentItems: string[]) {
        return this.request<Recommendation[]>('/api/v1/robot/recommendations/upsell', {
            params: { restaurant_id: restaurantId, current_items: currentItems.join(',') },
        });
    }
}

// 类型定义
export interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    is_available: boolean;
    is_featured: boolean;
    category_id: string;
}

export interface MenuCategoryWithItems {
    id: string;
    name: string;
    items: MenuItem[];
}

export interface OrderItem {
    id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes?: string;
}

export interface Order {
    id: string;
    order_number: string;
    order_type: 'dine_in' | 'takeout' | 'delivery';
    status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
    subtotal: number;
    tax: number;
    tip: number;
    total: number;
    table_number?: string;
    items: OrderItem[];
    created_at: string;
}

export interface OrderSummary {
    id: string;
    order_number: string;
    order_type: string;
    status: string;
    total: number;
    item_count: number;
    table_number?: string;
    created_at: string;
}

export interface CreateOrderRequest {
    restaurant_id: string;
    order_type: string;
    table_number?: string;
    items: {
        menu_item_id: string;
        quantity: number;
        unit_price: number;
    }[];
    tip?: number;
}

export interface Table {
    id: string;
    table_number: string;
    capacity: number;
    status: 'available' | 'occupied' | 'reserved' | 'cleaning';
    section?: string;
}

export interface TableStats {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
    cleaning: number;
}

export interface Staff {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role: string;
    hourly_rate: number;
    is_active: boolean;
}

export interface StaffStats {
    total: number;
    manager: number;
    server: number;
    chef: number;
    cashier: number;
    host: number;
}



export interface RobotStatus {
    id: string;
    name: string;
    status: 'idle' | 'cooking' | 'warming' | 'error';
    current_dish?: string;
    temperature: number;
    time_remaining: number;
    order_id?: string;
}

export interface PendingRobotItem {
    id: string;
    dish_name: string;
    quantity: number;
    wait_time: string;
    order_number: string;
}

// ============ 新增类型定义 ============

// 修饰符
export interface ModifierOption {
    id: string;
    name: string;
    price_adjustment: number;
    is_default: boolean;
    is_available: boolean;
}

export interface ModifierGroup {
    id: string;
    name: string;
    min_select: number;
    max_select: number;
    is_required: boolean;
    options: ModifierOption[];
}

export interface MenuItemWithModifiers extends MenuItem {
    modifier_groups: ModifierGroup[];
}

export interface CreateModifierGroupRequest {
    menu_item_id: string;
    name: string;
    min_select?: number;
    max_select?: number;
    is_required?: boolean;
    options?: Omit<ModifierOption, 'id'>[];
}

// 支付
export interface Payment {
    id: string;
    order_id: string;
    amount: number;
    payment_method: string;
    status: string;
    tip_amount: number;
    created_at: string;
}

export interface ProcessPaymentRequest {
    order_id: string;
    payments: {
        restaurant_id: string;
        amount: number;
        payment_method: string;
        tip_amount?: number;
        cash_received?: number;
    }[];
}

export interface ProcessPaymentResponse {
    order_id: string;
    total_paid: number;
    remaining: number;
    payments: Payment[];
    status: string;
}

export interface Refund {
    id: string;
    payment_id: string;
    amount: number;
    status: string;
    reason: string;
    created_at: string;
}

export interface CreateRefundRequest {
    payment_id: string;
    amount: number;
    reason: string;
    reason_code?: string;
    requested_by: string;
}

export interface Discount {
    id: string;
    name: string;
    code?: string;
    discount_type: string;
    discount_value: number;
    is_active: boolean;
}

export interface ApplyDiscountResponse {
    order_id: string;
    discount_id: string;
    discount_name: string;
    discount_amount: number;
    new_total: number;
}

// 现金管理
export interface CashDrawer {
    id: string;
    opening_balance: number;
    current_balance: number;
    expected_balance: number;
    is_open: boolean;
    variance: number;
}

export interface OpenCashDrawerRequest {
    restaurant_id: string;
    opening_balance: number;
    opened_by: string;
}

export interface CloseCashDrawerRequest {
    actual_balance: number;
    closed_by: string;
}

export interface ShiftSummary {
    cash_drawer_id: string;
    total_sales: number;
    total_orders: number;
    cash_sales: number;
    card_sales: number;
    total_tips: number;
    variance: number;
}

// 库存
export interface Ingredient {
    id: string;
    name: string;
    unit: string;
    current_stock: number;
    low_stock_threshold: number;
    cost_per_unit: number;
    is_low_stock: boolean;
}

export interface CreateIngredientRequest {
    restaurant_id: string;
    name: string;
    unit: string;
    current_stock?: number;
    low_stock_threshold?: number;
    cost_per_unit?: number;
}

export interface LowStockAlert {
    ingredient_id: string;
    ingredient_name: string;
    current_stock: number;
    low_stock_threshold: number;
    unit: string;
}

export interface Supplier {
    id: string;
    name: string;
    contact_name?: string;
    phone?: string;
    email?: string;
}

export interface PurchaseOrder {
    id: string;
    order_number: string;
    supplier_id: string;
    status: string;
    total: number;
    created_at: string;
}

// 排班
export interface Schedule {
    id: string;
    staff_id: string;
    schedule_date: string;
    shift_start: string;
    shift_end: string;
    status: string;
    is_published: boolean;
}

export interface CreateScheduleRequest {
    restaurant_id: string;
    staff_id: string;
    schedule_date: string;
    shift_start: string;
    shift_end: string;
    role?: string;
}

export interface TimeEntry {
    id: string;
    staff_id: string;
    clock_in?: string;
    clock_out?: string;
    total_minutes: number;
    tips_received: number;
}

export interface ClockInRequest {
    restaurant_id: string;
    staff_id: string;
}

export interface TipPool {
    id: string;
    pool_date: string;
    total_tips: number;
    is_distributed: boolean;
}

export interface TipPoolWithDistributions extends TipPool {
    distributions: {
        staff_id: string;
        amount: number;
    }[];
}

// 报表
export interface PMIXReport {
    period_start: string;
    period_end: string;
    total_items_sold: number;
    total_gross_sales: number;
    items: PMIXItem[];
}

export interface PMIXItem {
    menu_item_id: string;
    menu_item_name: string;
    quantity_sold: number;
    gross_sales: number;
    profit_margin: number;
}

export interface DailySalesReport {
    report_date: string;
    total_orders: number;
    gross_sales: number;
    net_sales: number;
    tips: number;
    refunds: number;
}

export interface LaborCostReport {
    period_start: string;
    period_end: string;
    total_hours: number;
    total_wages: number;
    labor_cost_percentage: number;
}

export interface DashboardMetrics {
    today_sales: number;
    today_orders: number;
    sales_change_percent: number;
    active_orders: number;
    tables_occupied: number;
    tables_available: number;
    low_stock_items: number;
}

export interface AuditLog {
    id: string;
    action: string;
    entity_type?: string;
    entity_id?: string;
    staff_id?: string;
    created_at: string;
}

// 订单扩展
export interface SplitOrderResponse {
    original_order: Order;
    split_orders: Order[];
}

// Expo
export interface ExpoQueueItem {
    order_id: string;
    order_number: string;
    table_number?: string;
    current_course: number;
    courses: Record<string, { item_id: string; menu_item_name: string }[]>;
}

export interface PacingPlan {
    order_id: string;
    pacing_plan: Record<string, { total_prep_time: number; items: any[] }>;
}

// 推荐
export interface Recommendation {
    menu_item: MenuItem;
    reason: string;
    score: number;
}

// ============ Triple Agent 类型 ============

export interface AIProvider {
    name: string;
    type: string;
    available: boolean;
    cost_per_call: number;
    is_default: boolean;
}

export interface TripleAgentResult {
    success: boolean;
    thinking: string;
    action: string;
    raw_content: string;
    error?: string;
    provider_used: string;
    fallback_chain: string[];
    cost_estimate: number;
}

export interface MultiTaskResult {
    success: boolean;
    command: string;
    tasks_count: number;
    tasks: {
        task_id: number;
        task_type: string;
        instruction: string;
        success: boolean;
        provider_used: string;
        response: string;
    }[];
    total_cost: number;
    summary: string;
}

export interface ComplexityAssessment {
    success: boolean;
    command: string;
    complexity: string;
    recommended_provider: string;
    fallback_chain: string[];
}

// ============ Triple Agent API 扩展 ============

class TripleAgentApi {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async postForm<T>(endpoint: string, data: Record<string, any>): Promise<T> {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        });

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    private async get<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * 执行 AI 指令 (智能路由)
     */
    async execute(
        command: string,
        screenshot?: string,
        currentPage?: string,
        forceProvider?: string
    ): Promise<TripleAgentResult> {
        return this.postForm('/api/v1/agent/triple/execute', {
            command,
            screenshot,
            current_page: currentPage,
            force_provider: forceProvider,
        });
    }

    /**
     * 执行多任务指令
     */
    async executeMultiTask(
        command: string,
        screenshot?: string,
        currentPage?: string
    ): Promise<MultiTaskResult> {
        return this.postForm('/api/v1/agent/triple/multi-task', {
            command,
            screenshot,
            current_page: currentPage,
        });
    }

    /**
     * 获取 Provider 列表
     */
    async getProviders(): Promise<{
        success: boolean;
        providers: AIProvider[];
        routing_strategy: string;
        default_agent: string;
    }> {
        return this.get('/api/v1/agent/triple/providers');
    }

    /**
     * 设置路由策略
     */
    async setStrategy(strategy: string): Promise<{
        success: boolean;
        message: string;
        routing_strategy: string;
    }> {
        return this.postForm('/api/v1/agent/triple/strategy', { strategy });
    }

    /**
     * 评估指令复杂度
     */
    async assessComplexity(command: string): Promise<ComplexityAssessment> {
        return this.postForm('/api/v1/agent/triple/assess', { command });
    }

    /**
     * 分解任务 (预览)
     */
    async decompose(command: string): Promise<{
        success: boolean;
        command: string;
        tasks_count: number;
        tasks: {
            id: number;
            type: string;
            action: string;
            target: string;
        }[];
    }> {
        return this.postForm('/api/v1/agent/decompose', { command });
    }
}

// 导出单例
export const api = new ApiClient(API_URL);
export const tripleAgent = new TripleAgentApi(API_URL);

