"""
报表与审计 Pydantic Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date

from app.models.audit import AuditAction, AuditSeverity


# ============ 审计日志 Schemas ============

class AuditLogCreate(BaseModel):
    restaurant_id: Optional[str] = None
    action: AuditAction
    severity: AuditSeverity = AuditSeverity.INFO
    description: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    staff_id: Optional[str] = None
    user_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    required_manager_approval: bool = False
    manager_id: Optional[str] = None
    manager_pin_used: bool = False


class AuditLogResponse(BaseModel):
    id: str
    restaurant_id: Optional[str] = None
    action: AuditAction
    severity: AuditSeverity
    description: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    staff_id: Optional[str] = None
    user_id: Optional[str] = None
    ip_address: Optional[str] = None
    required_manager_approval: bool = False
    manager_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogFilter(BaseModel):
    """审计日志筛选条件"""
    action: Optional[AuditAction] = None
    severity: Optional[AuditSeverity] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    staff_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


# ============ PMIX (产品销售分析) Schemas ============

class PMIXItem(BaseModel):
    """单品销售分析"""
    menu_item_id: str
    menu_item_name: str
    category_name: str
    quantity_sold: int = 0
    gross_sales: float = 0.0
    net_sales: float = 0.0  # 扣除折扣后
    discount_amount: float = 0.0
    void_count: int = 0
    void_amount: float = 0.0
    average_price: float = 0.0
    cost: float = 0.0
    profit: float = 0.0
    profit_margin: float = 0.0  # 利润率
    sales_percentage: float = 0.0  # 占总销售额比例


class PMIXReport(BaseModel):
    """PMIX 报告"""
    period_start: datetime
    period_end: datetime
    restaurant_id: str
    
    # 汇总
    total_items_sold: int = 0
    total_gross_sales: float = 0.0
    total_net_sales: float = 0.0
    total_discount: float = 0.0
    total_voids: float = 0.0
    total_cost: float = 0.0
    total_profit: float = 0.0
    average_profit_margin: float = 0.0
    
    # 明细
    items: List[PMIXItem] = []
    
    # 按分类汇总
    by_category: Dict[str, Dict[str, Any]] = {}
    
    # 按时段（小时）汇总
    by_hour: Dict[int, Dict[str, Any]] = {}


class PMIXFilter(BaseModel):
    """PMIX 筛选条件"""
    start_date: datetime
    end_date: datetime
    category_id: Optional[str] = None
    order_type: Optional[str] = None  # dine_in, takeout, delivery


# ============ 销售报表 Schemas ============

class DailySalesReport(BaseModel):
    """日销售报表"""
    report_date: date
    restaurant_id: str
    
    # 订单统计
    total_orders: int = 0
    dine_in_orders: int = 0
    takeout_orders: int = 0
    delivery_orders: int = 0
    
    # 销售额
    gross_sales: float = 0.0
    discounts: float = 0.0
    net_sales: float = 0.0
    
    # 税费
    tax_collected: float = 0.0
    
    # 小费
    tips: float = 0.0
    
    # 支付方式分布
    cash_payments: float = 0.0
    card_payments: float = 0.0
    mobile_payments: float = 0.0
    other_payments: float = 0.0
    
    # 退款
    refunds: float = 0.0
    refund_count: int = 0
    
    # 作废
    voids: float = 0.0
    void_count: int = 0
    
    # 平均值
    average_order_value: float = 0.0
    average_items_per_order: float = 0.0
    
    # 人数（堂食）
    total_guests: int = 0
    average_check_per_guest: float = 0.0


class SalesTrendReport(BaseModel):
    """销售趋势报表"""
    period_type: str  # daily, weekly, monthly
    period_start: date
    period_end: date
    
    data_points: List[Dict[str, Any]] = []  # [{"date": "2024-01-15", "sales": 1500.0, "orders": 50}, ...]
    
    # 同比/环比
    comparison_period_start: Optional[date] = None
    comparison_period_end: Optional[date] = None
    comparison_data: Optional[List[Dict[str, Any]]] = None
    
    # 增长率
    growth_rate: float = 0.0


class HourlySalesReport(BaseModel):
    """分时段销售报表"""
    report_date: date
    restaurant_id: str
    
    # 按小时统计
    hourly_data: Dict[int, Dict[str, Any]] = {}  # {8: {"orders": 5, "sales": 150.0}, ...}
    
    # 高峰时段
    peak_hour: int = 0
    peak_hour_sales: float = 0.0
    peak_hour_orders: int = 0


# ============ 人工成本报表 Schemas ============

class LaborCostReport(BaseModel):
    """人工成本报表"""
    period_start: date
    period_end: date
    restaurant_id: str
    
    # 工时统计
    total_regular_hours: float = 0.0
    total_overtime_hours: float = 0.0
    total_hours: float = 0.0
    
    # 成本
    regular_wages: float = 0.0
    overtime_wages: float = 0.0
    total_wages: float = 0.0
    tips_paid: float = 0.0
    total_labor_cost: float = 0.0
    
    # 销售对比
    total_sales: float = 0.0
    labor_cost_percentage: float = 0.0  # 目标 <30%
    
    # 按角色分布
    by_role: Dict[str, Dict[str, Any]] = {}  # {"SERVER": {"hours": 100, "cost": 1500}, ...}
    
    # 按员工
    by_staff: List[Dict[str, Any]] = []


class LaborEfficiencyReport(BaseModel):
    """人效报表"""
    period_start: date
    period_end: date
    
    # 人效指标
    sales_per_labor_hour: float = 0.0  # 每工时销售额
    guests_per_labor_hour: float = 0.0  # 每工时服务人数
    orders_per_labor_hour: float = 0.0  # 每工时订单数
    
    # 按时段人效
    by_shift: Dict[str, Dict[str, Any]] = {}  # {"lunch": {...}, "dinner": {...}}


# ============ 库存报表 Schemas ============

class InventoryCostReport(BaseModel):
    """库存成本报表"""
    period_start: date
    period_end: date
    restaurant_id: str
    
    # 期初期末
    opening_inventory_value: float = 0.0
    closing_inventory_value: float = 0.0
    
    # 采购
    purchases: float = 0.0
    
    # 消耗
    cost_of_goods_sold: float = 0.0
    waste: float = 0.0
    
    # 周转率
    inventory_turnover: float = 0.0
    
    # 食材成本率
    food_cost_percentage: float = 0.0  # 目标 28-32%
    
    # 按分类
    by_category: Dict[str, Dict[str, Any]] = {}


# ============ 综合日结报表 ============

class EndOfDayReport(BaseModel):
    """日结报表（综合）"""
    report_date: date
    restaurant_id: str
    generated_at: datetime
    
    # 销售汇总
    sales: DailySalesReport
    
    # 支付汇总
    payments_summary: Dict[str, Any] = {}
    
    # 现金管理
    cash_summary: Dict[str, Any] = {}  # opening, closing, variance
    
    # 人工成本
    labor_summary: Dict[str, Any] = {}
    
    # 库存变动
    inventory_summary: Dict[str, Any] = {}
    
    # 关键指标
    kpis: Dict[str, Any] = {}  # labor%, food_cost%, average_check, etc.
    
    # 异常/警告
    alerts: List[str] = []


# ============ 仪表盘 Schemas ============

class DashboardMetrics(BaseModel):
    """仪表盘指标"""
    timestamp: datetime
    
    # 今日实时
    today_sales: float = 0.0
    today_orders: int = 0
    today_guests: int = 0
    
    # 同比昨日
    yesterday_sales: float = 0.0
    sales_change_percent: float = 0.0
    
    # 当前状态
    active_orders: int = 0
    pending_orders: int = 0
    tables_occupied: int = 0
    tables_available: int = 0
    
    # 厨房状态
    average_prep_time: float = 0.0  # 分钟
    orders_in_kitchen: int = 0
    
    # 人员
    staff_on_duty: int = 0
    
    # 库存预警
    low_stock_items: int = 0
    out_of_stock_items: int = 0
