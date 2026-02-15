from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import uuid
import copy

from app.database import get_db
from app.config import get_settings
from app.models.order import Order, OrderItem, OrderStatus, FireStatus
from app.models.menu import MenuItem
from app.models.modifier import ModifierOption
from app.schemas.order import (
    OrderCreate, OrderResponse, OrderUpdate, OrderSummary,
    SplitBySeatsRequest, SplitByItemsRequest, SplitEvenRequest,
    MergeOrdersRequest, TransferTableRequest, FireCourseRequest,
    VoidItemRequest, AddItemsRequest, SplitOrderResponse, OrderWithSplits,
    OrderItemCreate, OrderItemUpdate, OrderItemResponse
)

router = APIRouter()
settings = get_settings()


def generate_order_number() -> str:
    """生成订单号"""
    now = datetime.now()
    return f"{now.strftime('%m%d')}-{uuid.uuid4().hex[:6].upper()}"


@router.get("/", response_model=List[OrderSummary])
async def get_orders(
    restaurant_id: str,
    status: OrderStatus = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """获取订单列表"""
    query = select(Order).where(Order.restaurant_id == restaurant_id)
    
    if status:
        query = query.where(Order.status == status)
    
    query = query.order_by(Order.created_at.desc()).limit(limit)
    result = await db.execute(query)
    orders = result.scalars().all()
    
    # 转换为摘要格式
    summaries = []
    for order in orders:
        items_result = await db.execute(
            select(func.count(OrderItem.id)).where(OrderItem.order_id == order.id)
        )
        item_count = items_result.scalar() or 0
        
        summaries.append(OrderSummary(
            id=order.id,
            order_number=order.order_number,
            order_type=order.order_type,
            status=order.status,
            total=order.total,
            item_count=item_count,
            table_number=order.table_number,
            created_at=order.created_at
        ))
    
    return summaries


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, db: AsyncSession = Depends(get_db)):
    """获取订单详情"""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    return order


async def calculate_modifier_price(db: AsyncSession, selected_modifiers: list) -> float:
    """计算修饰符加价"""
    if not selected_modifiers:
        return 0.0
    
    total_modifier_price = 0.0
    for selection in selected_modifiers:
        for option_id in selection.get("option_ids", []):
            option = await db.get(ModifierOption, option_id)
            if option:
                total_modifier_price += option.price_adjustment
    
    return total_modifier_price


@router.post("/", response_model=OrderResponse)
async def create_order(
    order_in: OrderCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """创建订单 - 支持修饰符、座位号、课程"""
    # 计算订单金额
    subtotal = 0.0
    order_items = []
    max_course = 1
    
    for item_data in order_in.items:
        # 获取菜品信息验证价格
        menu_result = await db.execute(
            select(MenuItem).where(MenuItem.id == item_data.menu_item_id)
        )
        menu_item = menu_result.scalar_one_or_none()
        if not menu_item:
            raise HTTPException(status_code=400, detail=f"菜品不存在: {item_data.menu_item_id}")
        
        # 计算修饰符加价
        modifier_price = 0.0
        if item_data.selected_modifiers:
            modifier_price = await calculate_modifier_price(
                db, 
                [m.model_dump() for m in item_data.selected_modifiers]
            )
        
        item_total = (item_data.unit_price + modifier_price) * item_data.quantity
        subtotal += item_total
        
        # 跟踪最大课程号
        if item_data.course > max_course:
            max_course = item_data.course
        
        order_items.append(OrderItem(
            menu_item_id=item_data.menu_item_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            total_price=item_total,
            modifier_price=modifier_price,
            notes=item_data.notes,
            taste_modifiers=item_data.taste_modifiers,
            selected_modifiers=[m.model_dump() for m in item_data.selected_modifiers] if item_data.selected_modifiers else None,
            seat_number=item_data.seat_number,
            course=item_data.course,
            fire_status=FireStatus.HOLD
        ))
    
    # 计算税费和总额
    tax = subtotal * settings.DEFAULT_TAX_RATE
    total = subtotal + tax + order_in.tip
    
    # 创建订单
    order = Order(
        restaurant_id=order_in.restaurant_id,
        customer_id=order_in.customer_id,
        server_id=order_in.server_id,
        order_number=generate_order_number(),
        order_type=order_in.order_type,
        status=OrderStatus.PENDING,
        subtotal=subtotal,
        tax=tax,
        tip=order_in.tip,
        total=total,
        notes=order_in.notes,
        table_number=order_in.table_number,
        guest_count=order_in.guest_count,
        total_courses=max_course,
        delivery_address=order_in.delivery_address,
        delivery_platform=order_in.delivery_platform,
        discount_code=order_in.discount_code,
    )
    
    # 关联订单明细
    for oi in order_items:
        oi.order = order
    
    db.add(order)
    db.add_all(order_items)
    await db.commit()
    await db.refresh(order)
    
    # 发布到 Redis（KDS 实时通知）
    try:
        redis = request.app.state.redis
        await redis.publish("orders:new", order.id)
    except Exception as e:
        print(f"Redis 发布失败: {e}")
    
    # 重新加载带 items 的订单
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order.id)
    )
    return result.scalar_one()


@router.patch("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: str,
    order_in: OrderUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """更新订单状态"""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    update_data = order_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(order, key, value)
    
    await db.commit()
    await db.refresh(order)
    
    # 状态变更通知
    if order_in.status:
        try:
            redis = request.app.state.redis
            await redis.publish("orders:status", f"{order_id}:{order_in.status}")
        except Exception as e:
            print(f"Redis 发布失败: {e}")
    
    return order


@router.get("/kds/pending", response_model=List[OrderResponse])
async def get_kds_orders(
    restaurant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取 KDS 待处理订单"""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.restaurant_id == restaurant_id)
        .where(Order.status.in_([OrderStatus.PENDING, OrderStatus.PREPARING]))
        .order_by(Order.created_at)
    )
    return result.scalars().all()


# ============ 分单功能 ============

@router.post("/{order_id}/split/by-seats", response_model=SplitOrderResponse)
async def split_order_by_seats(
    order_id: str,
    data: SplitBySeatsRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """按座位分单"""
    # 获取原订单
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    original_order = result.scalar_one_or_none()
    if not original_order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if original_order.status not in [OrderStatus.PENDING, OrderStatus.PREPARING]:
        raise HTTPException(status_code=400, detail="只能分拆进行中的订单")
    
    # 按座位分组菜品
    items_to_split = [item for item in original_order.items if item.seat_number in data.seats]
    if not items_to_split:
        raise HTTPException(status_code=400, detail="没有找到指定座位的菜品")
    
    # 创建新订单
    new_order = Order(
        restaurant_id=original_order.restaurant_id,
        customer_id=original_order.customer_id,
        server_id=original_order.server_id,
        order_number=generate_order_number(),
        order_type=original_order.order_type,
        status=original_order.status,
        parent_order_id=original_order.id,
        split_type="by_seat",
        table_number=original_order.table_number,
        guest_count=len(data.seats),
        notes=f"从订单 {original_order.order_number} 按座位分出",
    )
    
    # 转移菜品到新订单
    new_subtotal = 0.0
    for item in items_to_split:
        new_subtotal += item.total_price
        item.order = new_order
    
    # 计算新订单金额
    new_order.subtotal = new_subtotal
    new_order.tax = new_subtotal * settings.DEFAULT_TAX_RATE
    new_order.total = new_order.subtotal + new_order.tax
    
    # 重新计算原订单金额
    remaining_subtotal = sum(item.total_price for item in original_order.items if item not in items_to_split)
    original_order.subtotal = remaining_subtotal
    original_order.tax = remaining_subtotal * settings.DEFAULT_TAX_RATE
    original_order.total = original_order.subtotal + original_order.tax + original_order.tip
    original_order.guest_count -= len(data.seats)
    
    db.add(new_order)
    await db.commit()
    
    # 重新加载订单
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == original_order.id)
    )
    updated_original = result.scalar_one()
    
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == new_order.id)
    )
    new_order_loaded = result.scalar_one()
    
    # 通知
    try:
        redis = request.app.state.redis
        await redis.publish("orders:split", f"{order_id}:{new_order.id}")
    except Exception:
        pass
    
    return SplitOrderResponse(
        original_order=updated_original,
        split_orders=[new_order_loaded]
    )


@router.post("/{order_id}/split/by-items", response_model=SplitOrderResponse)
async def split_order_by_items(
    order_id: str,
    data: SplitByItemsRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """按菜品分单"""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    original_order = result.scalar_one_or_none()
    if not original_order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if original_order.status not in [OrderStatus.PENDING, OrderStatus.PREPARING]:
        raise HTTPException(status_code=400, detail="只能分拆进行中的订单")
    
    # 找到要分出的菜品
    items_to_split = [item for item in original_order.items if item.id in data.item_ids]
    if not items_to_split:
        raise HTTPException(status_code=400, detail="没有找到指定的菜品")
    
    # 创建新订单
    new_order = Order(
        restaurant_id=original_order.restaurant_id,
        customer_id=original_order.customer_id,
        server_id=original_order.server_id,
        order_number=generate_order_number(),
        order_type=original_order.order_type,
        status=original_order.status,
        parent_order_id=original_order.id,
        split_type="by_item",
        table_number=original_order.table_number,
        notes=f"从订单 {original_order.order_number} 按菜品分出",
    )
    
    # 转移菜品
    new_subtotal = 0.0
    for item in items_to_split:
        new_subtotal += item.total_price
        item.order = new_order
    
    new_order.subtotal = new_subtotal
    new_order.tax = new_subtotal * settings.DEFAULT_TAX_RATE
    new_order.total = new_order.subtotal + new_order.tax
    
    # 更新原订单
    remaining_subtotal = sum(item.total_price for item in original_order.items if item not in items_to_split)
    original_order.subtotal = remaining_subtotal
    original_order.tax = remaining_subtotal * settings.DEFAULT_TAX_RATE
    original_order.total = original_order.subtotal + original_order.tax + original_order.tip
    
    db.add(new_order)
    await db.commit()
    
    # 重新加载
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == original_order.id)
    )
    updated_original = result.scalar_one()
    
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == new_order.id)
    )
    new_order_loaded = result.scalar_one()
    
    return SplitOrderResponse(
        original_order=updated_original,
        split_orders=[new_order_loaded]
    )


@router.post("/{order_id}/split/even", response_model=SplitOrderResponse)
async def split_order_evenly(
    order_id: str,
    data: SplitEvenRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """平均分单"""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    original_order = result.scalar_one_or_none()
    if not original_order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if original_order.status not in [OrderStatus.PENDING, OrderStatus.PREPARING]:
        raise HTTPException(status_code=400, detail="只能分拆进行中的订单")
    
    split_count = data.split_count
    per_person_subtotal = original_order.subtotal / split_count
    per_person_tax = original_order.tax / split_count
    per_person_tip = original_order.tip / split_count
    per_person_total = original_order.total / split_count
    
    split_orders = []
    
    # 创建 split_count - 1 个新订单（原订单作为第一份）
    for i in range(1, split_count):
        new_order = Order(
            restaurant_id=original_order.restaurant_id,
            customer_id=original_order.customer_id,
            server_id=original_order.server_id,
            order_number=generate_order_number(),
            order_type=original_order.order_type,
            status=original_order.status,
            parent_order_id=original_order.id,
            split_type="even",
            table_number=original_order.table_number,
            guest_count=1,
            subtotal=per_person_subtotal,
            tax=per_person_tax,
            tip=per_person_tip,
            total=per_person_total,
            notes=f"从订单 {original_order.order_number} 平分 ({i+1}/{split_count})",
        )
        db.add(new_order)
        split_orders.append(new_order)
    
    # 更新原订单金额为第一份
    original_order.subtotal = per_person_subtotal
    original_order.tax = per_person_tax
    original_order.tip = per_person_tip
    original_order.total = per_person_total
    original_order.guest_count = 1
    original_order.notes = (original_order.notes or "") + f"\n平分订单 (1/{split_count})"
    
    await db.commit()
    
    # 重新加载
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == original_order.id)
    )
    updated_original = result.scalar_one()
    
    loaded_split_orders = []
    for so in split_orders:
        result = await db.execute(
            select(Order).options(selectinload(Order.items)).where(Order.id == so.id)
        )
        loaded_split_orders.append(result.scalar_one())
    
    return SplitOrderResponse(
        original_order=updated_original,
        split_orders=loaded_split_orders
    )


# ============ 合单功能 ============

@router.post("/merge", response_model=OrderResponse)
async def merge_orders(
    data: MergeOrdersRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """合并多个订单"""
    orders = []
    for oid in data.order_ids:
        result = await db.execute(
            select(Order).options(selectinload(Order.items)).where(Order.id == oid)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail=f"订单不存在: {oid}")
        if order.status not in [OrderStatus.PENDING, OrderStatus.PREPARING]:
            raise HTTPException(status_code=400, detail=f"订单 {order.order_number} 无法合并")
        orders.append(order)
    
    # 验证是同一餐厅、同一桌
    restaurant_ids = set(o.restaurant_id for o in orders)
    if len(restaurant_ids) > 1:
        raise HTTPException(status_code=400, detail="只能合并同一餐厅的订单")
    
    # 以第一个订单为主订单
    main_order = orders[0]
    
    # 合并其他订单的菜品到主订单
    for order in orders[1:]:
        for item in order.items:
            item.order_id = main_order.id
        
        # 累加金额
        main_order.subtotal += order.subtotal
        main_order.tip += order.tip
        main_order.guest_count += order.guest_count
        
        # 标记被合并的订单
        order.status = OrderStatus.CANCELLED
        order.notes = (order.notes or "") + f"\n已合并到订单 {main_order.order_number}"
    
    # 重新计算税和总额
    main_order.tax = main_order.subtotal * settings.DEFAULT_TAX_RATE
    main_order.total = main_order.subtotal + main_order.tax + main_order.tip
    main_order.notes = (main_order.notes or "") + f"\n合并了 {len(orders)-1} 个订单"
    
    await db.commit()
    
    # 重新加载
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == main_order.id)
    )
    
    try:
        redis = request.app.state.redis
        await redis.publish("orders:merge", main_order.id)
    except Exception:
        pass
    
    return result.scalar_one()


# ============ 转台功能 ============

@router.post("/{order_id}/transfer", response_model=OrderResponse)
async def transfer_table(
    order_id: str,
    data: TransferTableRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """转台"""
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if order.status not in [OrderStatus.PENDING, OrderStatus.PREPARING]:
        raise HTTPException(status_code=400, detail="只能转移进行中的订单")
    
    old_table = order.table_number
    order.table_number = data.new_table_number
    order.notes = (order.notes or "") + f"\n从桌 {old_table} 转到桌 {data.new_table_number}"
    
    await db.commit()
    await db.refresh(order)
    
    try:
        redis = request.app.state.redis
        await redis.publish("orders:transfer", f"{order_id}:{old_table}:{data.new_table_number}")
    except Exception:
        pass
    
    return order


# ============ Fire/Hold 课程管理 ============

@router.post("/{order_id}/fire", response_model=OrderResponse)
async def fire_course(
    order_id: str,
    data: FireCourseRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Fire 指定课程（发送到厨房）"""
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    # 确定要 Fire 的课程
    course_to_fire = data.course if data.course else order.current_course
    
    # Fire 该课程的所有菜品
    fired_items = []
    for item in order.items:
        if item.course == course_to_fire and item.fire_status == FireStatus.HOLD:
            item.fire_status = FireStatus.FIRED
            item.fired_at = datetime.utcnow()
            fired_items.append(item)
    
    if not fired_items:
        raise HTTPException(status_code=400, detail=f"课程 {course_to_fire} 没有待 Fire 的菜品")
    
    # 更新订单状态
    if order.status == OrderStatus.PENDING:
        order.status = OrderStatus.PREPARING
    
    if not order.fired_at:
        order.fired_at = datetime.utcnow()
    
    # 更新当前课程为下一课程
    if course_to_fire >= order.current_course:
        order.current_course = course_to_fire + 1
    
    await db.commit()
    
    # 通知 KDS
    try:
        redis = request.app.state.redis
        await redis.publish("orders:fire", f"{order_id}:{course_to_fire}")
    except Exception:
        pass
    
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    return result.scalar_one()


@router.post("/{order_id}/hold/{course}", response_model=OrderResponse)
async def hold_course(
    order_id: str,
    course: int,
    db: AsyncSession = Depends(get_db)
):
    """Hold 指定课程（暂缓）"""
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    # Hold 该课程的所有菜品
    for item in order.items:
        if item.course == course and item.fire_status == FireStatus.FIRED:
            item.fire_status = FireStatus.HOLD
            item.fired_at = None
    
    await db.commit()
    
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    return result.scalar_one()


# ============ 菜品操作 ============

@router.post("/{order_id}/items", response_model=OrderResponse)
async def add_items_to_order(
    order_id: str,
    data: AddItemsRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """追加菜品到订单"""
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if order.status not in [OrderStatus.PENDING, OrderStatus.PREPARING]:
        raise HTTPException(status_code=400, detail="只能向进行中的订单添加菜品")
    
    added_total = 0.0
    max_course = order.total_courses
    
    for item_data in data.items:
        menu_result = await db.execute(
            select(MenuItem).where(MenuItem.id == item_data.menu_item_id)
        )
        menu_item = menu_result.scalar_one_or_none()
        if not menu_item:
            raise HTTPException(status_code=400, detail=f"菜品不存在: {item_data.menu_item_id}")
        
        modifier_price = 0.0
        if item_data.selected_modifiers:
            modifier_price = await calculate_modifier_price(
                db, [m.model_dump() for m in item_data.selected_modifiers]
            )
        
        item_total = (item_data.unit_price + modifier_price) * item_data.quantity
        added_total += item_total
        
        if item_data.course > max_course:
            max_course = item_data.course
        
        new_item = OrderItem(
            order_id=order_id,
            menu_item_id=item_data.menu_item_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            total_price=item_total,
            modifier_price=modifier_price,
            notes=item_data.notes,
            selected_modifiers=[m.model_dump() for m in item_data.selected_modifiers] if item_data.selected_modifiers else None,
            seat_number=item_data.seat_number,
            course=item_data.course,
            fire_status=FireStatus.HOLD
        )
        db.add(new_item)
    
    # 更新订单金额
    order.subtotal += added_total
    order.tax = order.subtotal * settings.DEFAULT_TAX_RATE
    order.total = order.subtotal + order.tax + order.tip - order.discount
    order.total_courses = max_course
    
    await db.commit()
    
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    return result.scalar_one()


@router.delete("/{order_id}/items/{item_id}", response_model=OrderResponse)
async def void_order_item(
    order_id: str,
    item_id: str,
    data: VoidItemRequest,
    db: AsyncSession = Depends(get_db)
):
    """作废订单菜品"""
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    item = await db.get(OrderItem, item_id)
    if not item or item.order_id != order_id:
        raise HTTPException(status_code=404, detail="订单菜品不存在")
    
    if item.item_status == "void":
        raise HTTPException(status_code=400, detail="该菜品已作废")
    
    # 标记作废
    item.item_status = "void"
    item.void_reason = data.reason
    
    # 更新订单金额（减去作废菜品的金额）
    order.subtotal -= item.total_price
    order.tax = order.subtotal * settings.DEFAULT_TAX_RATE
    order.total = order.subtotal + order.tax + order.tip - order.discount
    
    await db.commit()
    
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    return result.scalar_one()


# ============ 获取带子订单的订单 ============

@router.get("/{order_id}/with-splits", response_model=OrderWithSplits)
async def get_order_with_splits(
    order_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取订单及其分单"""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.split_orders))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    # 加载子订单的 items
    split_orders_with_items = []
    for split_order in order.split_orders:
        result = await db.execute(
            select(Order).options(selectinload(Order.items)).where(Order.id == split_order.id)
        )
        split_orders_with_items.append(result.scalar_one())
    
    return OrderWithSplits(
        **order.__dict__,
        items=order.items,
        split_orders=split_orders_with_items
    )
