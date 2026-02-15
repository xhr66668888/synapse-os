"""
报表与审计 API
支持PMIX、销售报表、人工成本、审计日志
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, case
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, date, timedelta
from collections import defaultdict

from app.database import get_db
from app.config import get_settings
from app.models.audit import AuditLog, AuditAction, AuditSeverity
from app.models.order import Order, OrderItem, OrderStatus, OrderType
from app.models.payment import Payment, PaymentStatus, PaymentMethod, Refund
from app.models.menu import MenuItem, MenuCategory
from app.models.schedule import TimeEntry, TipPool
from app.models.inventory import Ingredient, StockMovement
from app.models.table import Table
from app.schemas.reports import (
    AuditLogCreate, AuditLogResponse, AuditLogFilter,
    PMIXItem, PMIXReport, PMIXFilter,
    DailySalesReport, SalesTrendReport, HourlySalesReport,
    LaborCostReport, LaborEfficiencyReport,
    EndOfDayReport, DashboardMetrics
)

router = APIRouter()
settings = get_settings()


# ============ 审计日志 ============

async def create_audit_log(
    db: AsyncSession,
    data: AuditLogCreate,
    request: Request = None
) -> AuditLog:
    """创建审计日志（工具函数）"""
    log = AuditLog(**data.model_dump())
    
    if request:
        log.ip_address = request.client.host if request.client else None
        log.user_agent = request.headers.get("user-agent")
    
    db.add(log)
    return log


@router.post("/audit", response_model=AuditLogResponse, status_code=status.HTTP_201_CREATED)
async def create_audit_entry(
    data: AuditLogCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """创建审计日志"""
    log = await create_audit_log(db, data, request)
    await db.commit()
    await db.refresh(log)
    return log


@router.get("/audit", response_model=List[AuditLogResponse])
async def get_audit_logs(
    restaurant_id: str,
    action: Optional[AuditAction] = None,
    severity: Optional[AuditSeverity] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    staff_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """获取审计日志"""
    query = select(AuditLog).where(AuditLog.restaurant_id == restaurant_id)
    
    if action:
        query = query.where(AuditLog.action == action)
    if severity:
        query = query.where(AuditLog.severity == severity)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
    if staff_id:
        query = query.where(AuditLog.staff_id == staff_id)
    if start_date:
        query = query.where(AuditLog.created_at >= start_date)
    if end_date:
        query = query.where(AuditLog.created_at <= end_date)
    
    query = query.order_by(AuditLog.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/audit/entity/{entity_type}/{entity_id}", response_model=List[AuditLogResponse])
async def get_entity_audit_trail(
    entity_type: str,
    entity_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取特定实体的审计轨迹"""
    result = await db.execute(
        select(AuditLog).where(
            and_(
                AuditLog.entity_type == entity_type,
                AuditLog.entity_id == entity_id
            )
        ).order_by(AuditLog.created_at.desc())
    )
    return result.scalars().all()


# ============ PMIX 报表 ============

@router.get("/pmix", response_model=PMIXReport)
async def get_pmix_report(
    restaurant_id: str,
    start_date: datetime,
    end_date: datetime,
    category_id: Optional[str] = None,
    order_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取产品销售分析报表 (PMIX)"""
    # 基础查询 - 获取订单项
    query = select(
        OrderItem,
        Order,
        MenuItem,
        MenuCategory
    ).join(
        Order, OrderItem.order_id == Order.id
    ).join(
        MenuItem, OrderItem.menu_item_id == MenuItem.id
    ).join(
        MenuCategory, MenuItem.category_id == MenuCategory.id
    ).where(
        and_(
            Order.restaurant_id == restaurant_id,
            Order.created_at >= start_date,
            Order.created_at <= end_date,
            Order.status.in_([OrderStatus.COMPLETED, OrderStatus.PREPARING, OrderStatus.READY])
        )
    )
    
    if category_id:
        query = query.where(MenuItem.category_id == category_id)
    if order_type:
        query = query.where(Order.order_type == order_type)
    
    result = await db.execute(query)
    rows = result.all()
    
    # 按菜品汇总
    item_stats = defaultdict(lambda: {
        "menu_item_id": "",
        "menu_item_name": "",
        "category_name": "",
        "quantity_sold": 0,
        "gross_sales": 0.0,
        "net_sales": 0.0,
        "discount_amount": 0.0,
        "void_count": 0,
        "void_amount": 0.0,
        "cost": 0.0
    })
    
    # 按分类汇总
    category_stats = defaultdict(lambda: {"quantity": 0, "sales": 0.0})
    
    # 按小时汇总
    hourly_stats = defaultdict(lambda: {"orders": 0, "sales": 0.0})
    
    total_gross_sales = 0.0
    total_cost = 0.0
    total_items = 0
    
    for order_item, order, menu_item, category in rows:
        item_id = menu_item.id
        
        if order_item.item_status == "void":
            item_stats[item_id]["void_count"] += order_item.quantity
            item_stats[item_id]["void_amount"] += order_item.total_price
        else:
            item_stats[item_id]["menu_item_id"] = item_id
            item_stats[item_id]["menu_item_name"] = menu_item.name
            item_stats[item_id]["category_name"] = category.name
            item_stats[item_id]["quantity_sold"] += order_item.quantity
            item_stats[item_id]["gross_sales"] += order_item.total_price
            item_stats[item_id]["net_sales"] += order_item.total_price  # TODO: 扣除分摊的折扣
            
            # 成本计算
            if menu_item.cost:
                item_stats[item_id]["cost"] += menu_item.cost * order_item.quantity
                total_cost += menu_item.cost * order_item.quantity
            
            total_gross_sales += order_item.total_price
            total_items += order_item.quantity
            
            # 分类汇总
            category_stats[category.name]["quantity"] += order_item.quantity
            category_stats[category.name]["sales"] += order_item.total_price
            
            # 小时汇总
            hour = order.created_at.hour
            hourly_stats[hour]["orders"] += 1
            hourly_stats[hour]["sales"] += order_item.total_price
    
    # 计算利润率和销售占比
    items = []
    for item_id, stats in item_stats.items():
        if stats["quantity_sold"] > 0:
            stats["average_price"] = stats["gross_sales"] / stats["quantity_sold"]
            stats["profit"] = stats["gross_sales"] - stats["cost"]
            stats["profit_margin"] = (stats["profit"] / stats["gross_sales"] * 100) if stats["gross_sales"] > 0 else 0
            stats["sales_percentage"] = (stats["gross_sales"] / total_gross_sales * 100) if total_gross_sales > 0 else 0
            items.append(PMIXItem(**stats))
    
    # 按销售额排序
    items.sort(key=lambda x: x.gross_sales, reverse=True)
    
    return PMIXReport(
        period_start=start_date,
        period_end=end_date,
        restaurant_id=restaurant_id,
        total_items_sold=total_items,
        total_gross_sales=total_gross_sales,
        total_net_sales=total_gross_sales,  # TODO: 扣除折扣
        total_cost=total_cost,
        total_profit=total_gross_sales - total_cost,
        average_profit_margin=((total_gross_sales - total_cost) / total_gross_sales * 100) if total_gross_sales > 0 else 0,
        items=items,
        by_category=dict(category_stats),
        by_hour=dict(hourly_stats)
    )


# ============ 销售报表 ============

@router.get("/sales/daily", response_model=DailySalesReport)
async def get_daily_sales_report(
    restaurant_id: str,
    report_date: date,
    db: AsyncSession = Depends(get_db)
):
    """获取日销售报表"""
    start_dt = datetime.combine(report_date, datetime.min.time())
    end_dt = datetime.combine(report_date, datetime.max.time())
    
    # 获取订单
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(
            and_(
                Order.restaurant_id == restaurant_id,
                Order.created_at >= start_dt,
                Order.created_at <= end_dt,
                Order.status != OrderStatus.CANCELLED
            )
        )
    )
    orders = result.scalars().all()
    
    # 计算统计
    total_orders = len(orders)
    dine_in_orders = sum(1 for o in orders if o.order_type == OrderType.DINE_IN)
    takeout_orders = sum(1 for o in orders if o.order_type == OrderType.TAKEOUT)
    delivery_orders = sum(1 for o in orders if o.order_type == OrderType.DELIVERY)
    
    gross_sales = sum(o.subtotal for o in orders)
    discounts = sum(o.discount for o in orders)
    net_sales = gross_sales - discounts
    tax_collected = sum(o.tax for o in orders)
    tips = sum(o.tip for o in orders)
    
    total_guests = sum(o.guest_count for o in orders if o.order_type == OrderType.DINE_IN)
    total_items = sum(len(o.items) for o in orders)
    
    # 获取支付信息
    payments_result = await db.execute(
        select(Payment).where(
            and_(
                Payment.restaurant_id == restaurant_id,
                Payment.created_at >= start_dt,
                Payment.created_at <= end_dt,
                Payment.status == PaymentStatus.COMPLETED
            )
        )
    )
    payments = payments_result.scalars().all()
    
    cash_payments = sum(p.amount for p in payments if p.payment_method == PaymentMethod.CASH)
    card_payments = sum(p.amount for p in payments if p.payment_method in [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD])
    mobile_payments = sum(p.amount for p in payments if p.payment_method in [PaymentMethod.ALIPAY, PaymentMethod.WECHAT_PAY, PaymentMethod.APPLE_PAY])
    other_payments = sum(p.amount for p in payments) - cash_payments - card_payments - mobile_payments
    
    # 退款
    refunds_result = await db.execute(
        select(Refund).where(
            and_(
                Refund.restaurant_id == restaurant_id,
                Refund.created_at >= start_dt,
                Refund.created_at <= end_dt
            )
        )
    )
    refunds = refunds_result.scalars().all()
    refund_amount = sum(r.amount for r in refunds)
    refund_count = len(refunds)
    
    return DailySalesReport(
        report_date=report_date,
        restaurant_id=restaurant_id,
        total_orders=total_orders,
        dine_in_orders=dine_in_orders,
        takeout_orders=takeout_orders,
        delivery_orders=delivery_orders,
        gross_sales=gross_sales,
        discounts=discounts,
        net_sales=net_sales,
        tax_collected=tax_collected,
        tips=tips,
        cash_payments=cash_payments,
        card_payments=card_payments,
        mobile_payments=mobile_payments,
        other_payments=other_payments,
        refunds=refund_amount,
        refund_count=refund_count,
        average_order_value=net_sales / total_orders if total_orders > 0 else 0,
        average_items_per_order=total_items / total_orders if total_orders > 0 else 0,
        total_guests=total_guests,
        average_check_per_guest=net_sales / total_guests if total_guests > 0 else 0
    )


@router.get("/sales/hourly", response_model=HourlySalesReport)
async def get_hourly_sales_report(
    restaurant_id: str,
    report_date: date,
    db: AsyncSession = Depends(get_db)
):
    """获取分时段销售报表"""
    start_dt = datetime.combine(report_date, datetime.min.time())
    end_dt = datetime.combine(report_date, datetime.max.time())
    
    result = await db.execute(
        select(Order).where(
            and_(
                Order.restaurant_id == restaurant_id,
                Order.created_at >= start_dt,
                Order.created_at <= end_dt,
                Order.status != OrderStatus.CANCELLED
            )
        )
    )
    orders = result.scalars().all()
    
    hourly_data = {}
    for hour in range(24):
        hourly_data[hour] = {"orders": 0, "sales": 0.0, "guests": 0}
    
    for order in orders:
        hour = order.created_at.hour
        hourly_data[hour]["orders"] += 1
        hourly_data[hour]["sales"] += order.total
        hourly_data[hour]["guests"] += order.guest_count
    
    # 找出高峰时段
    peak_hour = max(hourly_data.keys(), key=lambda h: hourly_data[h]["sales"])
    
    return HourlySalesReport(
        report_date=report_date,
        restaurant_id=restaurant_id,
        hourly_data=hourly_data,
        peak_hour=peak_hour,
        peak_hour_sales=hourly_data[peak_hour]["sales"],
        peak_hour_orders=hourly_data[peak_hour]["orders"]
    )


# ============ 人工成本报表 ============

@router.get("/labor-cost", response_model=LaborCostReport)
async def get_labor_cost_report(
    restaurant_id: str,
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db)
):
    """获取人工成本报表"""
    # 获取工时记录
    result = await db.execute(
        select(TimeEntry).where(
            and_(
                TimeEntry.restaurant_id == restaurant_id,
                func.date(TimeEntry.clock_in) >= start_date,
                func.date(TimeEntry.clock_in) <= end_date
            )
        )
    )
    entries = result.scalars().all()
    
    total_regular_hours = sum(e.regular_minutes for e in entries) / 60
    total_overtime_hours = sum(e.overtime_minutes for e in entries) / 60
    total_hours = total_regular_hours + total_overtime_hours
    
    regular_wages = sum((e.regular_minutes / 60) * (e.hourly_rate or 0) for e in entries)
    overtime_wages = sum((e.overtime_minutes / 60) * (e.hourly_rate or 0) * 1.5 for e in entries)
    total_wages = regular_wages + overtime_wages
    tips_paid = sum(e.tips_received for e in entries)
    
    # 获取销售额
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())
    
    sales_result = await db.execute(
        select(func.sum(Order.total)).where(
            and_(
                Order.restaurant_id == restaurant_id,
                Order.created_at >= start_dt,
                Order.created_at <= end_dt,
                Order.status == OrderStatus.COMPLETED
            )
        )
    )
    total_sales = sales_result.scalar() or 0
    
    labor_cost_percentage = ((total_wages + tips_paid) / total_sales * 100) if total_sales > 0 else 0
    
    return LaborCostReport(
        period_start=start_date,
        period_end=end_date,
        restaurant_id=restaurant_id,
        total_regular_hours=total_regular_hours,
        total_overtime_hours=total_overtime_hours,
        total_hours=total_hours,
        regular_wages=regular_wages,
        overtime_wages=overtime_wages,
        total_wages=total_wages,
        tips_paid=tips_paid,
        total_labor_cost=total_wages + tips_paid,
        total_sales=total_sales,
        labor_cost_percentage=labor_cost_percentage,
        by_role={},
        by_staff=[]
    )


# ============ 仪表盘 ============

@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    restaurant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取仪表盘实时指标"""
    now = datetime.utcnow()
    today_start = datetime.combine(now.date(), datetime.min.time())
    yesterday_start = today_start - timedelta(days=1)
    yesterday_end = today_start
    
    # 今日销售
    today_result = await db.execute(
        select(func.sum(Order.total), func.count(Order.id), func.sum(Order.guest_count)).where(
            and_(
                Order.restaurant_id == restaurant_id,
                Order.created_at >= today_start,
                Order.status != OrderStatus.CANCELLED
            )
        )
    )
    today_data = today_result.one()
    today_sales = today_data[0] or 0
    today_orders = today_data[1] or 0
    today_guests = today_data[2] or 0
    
    # 昨日销售
    yesterday_result = await db.execute(
        select(func.sum(Order.total)).where(
            and_(
                Order.restaurant_id == restaurant_id,
                Order.created_at >= yesterday_start,
                Order.created_at < yesterday_end,
                Order.status != OrderStatus.CANCELLED
            )
        )
    )
    yesterday_sales = yesterday_result.scalar() or 0
    
    sales_change = ((today_sales - yesterday_sales) / yesterday_sales * 100) if yesterday_sales > 0 else 0
    
    # 活跃订单
    active_result = await db.execute(
        select(func.count(Order.id)).where(
            and_(
                Order.restaurant_id == restaurant_id,
                Order.status.in_([OrderStatus.PENDING, OrderStatus.PREPARING])
            )
        )
    )
    active_orders = active_result.scalar() or 0
    
    # 桌位状态
    tables_result = await db.execute(
        select(
            func.count(case((Table.status == "occupied", 1))),
            func.count(case((Table.status == "available", 1)))
        ).where(
            and_(
                Table.restaurant_id == restaurant_id,
                Table.is_active == True
            )
        )
    )
    tables_data = tables_result.one()
    tables_occupied = tables_data[0] or 0
    tables_available = tables_data[1] or 0
    
    # 低库存
    low_stock_result = await db.execute(
        select(func.count(Ingredient.id)).where(
            and_(
                Ingredient.restaurant_id == restaurant_id,
                Ingredient.is_active == True,
                Ingredient.current_stock <= Ingredient.low_stock_threshold
            )
        )
    )
    low_stock_items = low_stock_result.scalar() or 0
    
    return DashboardMetrics(
        timestamp=now,
        today_sales=today_sales,
        today_orders=today_orders,
        today_guests=today_guests,
        yesterday_sales=yesterday_sales,
        sales_change_percent=sales_change,
        active_orders=active_orders,
        pending_orders=active_orders,
        tables_occupied=tables_occupied,
        tables_available=tables_available,
        orders_in_kitchen=active_orders,
        low_stock_items=low_stock_items,
        out_of_stock_items=0
    )


# ============ 日结报表 ============

@router.get("/end-of-day", response_model=EndOfDayReport)
async def get_end_of_day_report(
    restaurant_id: str,
    report_date: date,
    db: AsyncSession = Depends(get_db)
):
    """获取日结报表"""
    # 获取日销售报表
    sales = await get_daily_sales_report(restaurant_id, report_date, db)
    
    # KPIs
    kpis = {
        "average_check": sales.average_order_value,
        "table_turnover": 0,  # TODO: 计算翻台率
        "labor_cost_percentage": 0,  # TODO: 计算人工成本比
        "food_cost_percentage": 0,  # TODO: 计算食材成本比
    }
    
    # 警告
    alerts = []
    if sales.refund_count > 5:
        alerts.append(f"今日退款次数较多: {sales.refund_count}次")
    
    return EndOfDayReport(
        report_date=report_date,
        restaurant_id=restaurant_id,
        generated_at=datetime.utcnow(),
        sales=sales,
        payments_summary={
            "cash": sales.cash_payments,
            "card": sales.card_payments,
            "mobile": sales.mobile_payments,
            "other": sales.other_payments
        },
        cash_summary={},
        labor_summary={},
        inventory_summary={},
        kpis=kpis,
        alerts=alerts
    )
