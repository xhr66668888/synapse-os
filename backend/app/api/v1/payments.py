"""
支付管理 API
支持多种支付方式、现金管理、退款、折扣
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.config import get_settings
from app.models.payment import (
    Payment, PaymentMethod, PaymentStatus,
    Refund, RefundStatus,
    CashDrawer, CashTransaction, CashTransactionType,
    Discount, Gratuity
)
from app.models.order import Order, OrderStatus
from app.schemas.payment import (
    PaymentCreate, PaymentUpdate, PaymentResponse,
    RefundCreate, RefundApprove, RefundResponse,
    CashDrawerOpen, CashDrawerClose, CashDrawerResponse,
    CashTransactionCreate, CashTransactionResponse,
    DiscountCreate, DiscountUpdate, DiscountResponse,
    ApplyDiscountRequest, ApplyDiscountResponse,
    GratuityCreate, GratuityResponse,
    ProcessPaymentRequest, ProcessPaymentResponse,
    ShiftSummary
)

router = APIRouter()
settings = get_settings()


# ============ 支付处理 ============

@router.post("/process", response_model=ProcessPaymentResponse)
async def process_payment(
    data: ProcessPaymentRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    处理订单支付
    支持单一支付和拆分支付（多种支付方式）
    """
    # 获取订单
    order = await db.get(Order, data.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="订单已完成或已取消")
    
    # 计算已支付金额
    existing_payments_result = await db.execute(
        select(func.sum(Payment.amount)).where(
            and_(
                Payment.order_id == data.order_id,
                Payment.status == PaymentStatus.COMPLETED
            )
        )
    )
    existing_paid = existing_payments_result.scalar() or 0.0
    
    remaining = order.total - existing_paid
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="订单已全额支付")
    
    # 处理每个支付
    payments = []
    total_paid = 0.0
    
    for payment_data in data.payments:
        if payment_data.amount > remaining - total_paid:
            payment_data.amount = remaining - total_paid  # 调整最后一笔支付金额
        
        if payment_data.amount <= 0:
            continue
        
        payment = Payment(
            order_id=data.order_id,
            restaurant_id=payment_data.restaurant_id,
            amount=payment_data.amount,
            payment_method=payment_data.payment_method,
            tip_amount=payment_data.tip_amount,
            processed_by=payment_data.processed_by,
            notes=payment_data.notes
        )
        
        # 根据支付方式处理
        if payment_data.payment_method == PaymentMethod.CASH:
            # 现金支付
            if payment_data.cash_received:
                payment.cash_received = payment_data.cash_received
                payment.change_given = max(0, payment_data.cash_received - payment_data.amount)
            payment.status = PaymentStatus.COMPLETED
            payment.completed_at = datetime.utcnow()
            
        elif payment_data.payment_method in [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD]:
            # 卡支付 - 实际项目中这里会调用 Stripe/Square API
            if payment_data.payment_token:
                # TODO: 调用 Stripe Terminal API
                # result = await stripe_process_payment(payment_data.payment_token, payment_data.amount)
                payment.status = PaymentStatus.COMPLETED
                payment.completed_at = datetime.utcnow()
                payment.processor = "stripe"
                payment.transaction_id = f"pi_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
                # Mock card info
                payment.card_last_four = "4242"
                payment.card_brand = "visa"
            else:
                # 没有 token，标记为待处理（等待终端刷卡）
                payment.status = PaymentStatus.PENDING
                
        elif payment_data.payment_method in [PaymentMethod.ALIPAY, PaymentMethod.WECHAT_PAY]:
            # 移动支付 - 生成二维码
            payment.status = PaymentStatus.PENDING
            # TODO: 生成支付二维码
            
        else:
            # 其他支付方式直接标记完成
            payment.status = PaymentStatus.COMPLETED
            payment.completed_at = datetime.utcnow()
        
        db.add(payment)
        
        if payment.status == PaymentStatus.COMPLETED:
            total_paid += payment.amount
        
        payments.append(payment)
    
    # 更新订单状态
    if total_paid + existing_paid >= order.total:
        order.status = OrderStatus.COMPLETED
        order.completed_at = datetime.utcnow()
    
    # 更新订单小费
    total_tips = sum(p.tip_amount for p in payments)
    if total_tips > 0:
        order.tip += total_tips
        order.total += total_tips
    
    await db.commit()
    
    # 刷新支付记录
    payment_responses = []
    for p in payments:
        await db.refresh(p)
        payment_responses.append(PaymentResponse.model_validate(p))
    
    # 发送通知
    try:
        redis = request.app.state.redis
        await redis.publish("payments:completed", data.order_id)
    except Exception:
        pass
    
    return ProcessPaymentResponse(
        order_id=data.order_id,
        total_paid=total_paid + existing_paid,
        remaining=max(0, order.total - total_paid - existing_paid),
        payments=payment_responses,
        status="paid" if total_paid + existing_paid >= order.total else "partial"
    )


@router.get("/order/{order_id}", response_model=List[PaymentResponse])
async def get_order_payments(
    order_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取订单的所有支付记录"""
    result = await db.execute(
        select(Payment).where(Payment.order_id == order_id).order_by(Payment.created_at)
    )
    return result.scalars().all()


@router.patch("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: str,
    data: PaymentUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新支付状态（用于异步支付回调）"""
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="支付记录不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(payment, key, value)
    
    if data.status == PaymentStatus.COMPLETED:
        payment.completed_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(payment)
    return payment


# ============ 退款管理 ============

@router.post("/refunds", response_model=RefundResponse, status_code=status.HTTP_201_CREATED)
async def create_refund(
    data: RefundCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建退款申请"""
    payment = await db.get(Payment, data.payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="支付记录不存在")
    
    if payment.status != PaymentStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="只能退款已完成的支付")
    
    # 检查退款金额
    existing_refunds_result = await db.execute(
        select(func.sum(Refund.amount)).where(
            and_(
                Refund.payment_id == data.payment_id,
                Refund.status.in_([RefundStatus.COMPLETED, RefundStatus.APPROVED, RefundStatus.PROCESSING])
            )
        )
    )
    existing_refunded = existing_refunds_result.scalar() or 0.0
    
    if data.amount > payment.amount - existing_refunded:
        raise HTTPException(status_code=400, detail="退款金额超过可退金额")
    
    refund = Refund(
        payment_id=data.payment_id,
        order_id=payment.order_id,
        restaurant_id=payment.restaurant_id,
        amount=data.amount,
        reason=data.reason,
        reason_code=data.reason_code.value if data.reason_code else None,
        requested_by=data.requested_by,
        status=RefundStatus.PENDING
    )
    
    # 如果提供了经理PIN，自动批准
    if data.manager_pin:
        # TODO: 验证经理PIN
        refund.status = RefundStatus.APPROVED
        refund.approved_at = datetime.utcnow()
        refund.manager_pin_used = True
    
    db.add(refund)
    await db.commit()
    await db.refresh(refund)
    return refund


@router.post("/refunds/{refund_id}/approve", response_model=RefundResponse)
async def approve_refund(
    refund_id: str,
    data: RefundApprove,
    db: AsyncSession = Depends(get_db)
):
    """审批退款"""
    refund = await db.get(Refund, refund_id)
    if not refund:
        raise HTTPException(status_code=404, detail="退款记录不存在")
    
    if refund.status != RefundStatus.PENDING:
        raise HTTPException(status_code=400, detail="退款已处理")
    
    # TODO: 验证经理PIN
    
    refund.status = RefundStatus.APPROVED
    refund.approved_by = data.approved_by
    refund.approved_at = datetime.utcnow()
    refund.manager_pin_used = True
    
    await db.commit()
    await db.refresh(refund)
    return refund


@router.post("/refunds/{refund_id}/process", response_model=RefundResponse)
async def process_refund(
    refund_id: str,
    db: AsyncSession = Depends(get_db)
):
    """处理退款（执行退款操作）"""
    refund = await db.get(Refund, refund_id)
    if not refund:
        raise HTTPException(status_code=404, detail="退款记录不存在")
    
    if refund.status != RefundStatus.APPROVED:
        raise HTTPException(status_code=400, detail="退款未审批")
    
    refund.status = RefundStatus.PROCESSING
    
    # 获取原支付
    payment = await db.get(Payment, refund.payment_id)
    
    # 根据支付方式处理退款
    if payment.payment_method == PaymentMethod.CASH:
        # 现金退款直接完成
        refund.status = RefundStatus.COMPLETED
        refund.completed_at = datetime.utcnow()
    elif payment.payment_method in [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD]:
        # 卡退款 - 调用支付网关
        # TODO: 调用 Stripe Refund API
        refund.status = RefundStatus.COMPLETED
        refund.completed_at = datetime.utcnow()
        refund.refund_transaction_id = f"re_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    else:
        refund.status = RefundStatus.COMPLETED
        refund.completed_at = datetime.utcnow()
    
    # 更新订单状态
    order = await db.get(Order, refund.order_id)
    if order:
        order.status = OrderStatus.REFUNDED
    
    # 更新支付状态
    payment.status = PaymentStatus.REFUNDED if refund.amount >= payment.amount else PaymentStatus.PARTIAL_REFUND
    
    await db.commit()
    await db.refresh(refund)
    return refund


@router.get("/refunds", response_model=List[RefundResponse])
async def get_refunds(
    restaurant_id: str,
    status: Optional[RefundStatus] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取退款列表"""
    query = select(Refund).where(Refund.restaurant_id == restaurant_id)
    if status:
        query = query.where(Refund.status == status)
    query = query.order_by(Refund.created_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


# ============ 现金抽屉管理 ============

@router.post("/cash-drawer/open", response_model=CashDrawerResponse, status_code=status.HTTP_201_CREATED)
async def open_cash_drawer(
    data: CashDrawerOpen,
    db: AsyncSession = Depends(get_db)
):
    """开班 - 打开现金抽屉"""
    # 检查是否有未关闭的抽屉
    existing_result = await db.execute(
        select(CashDrawer).where(
            and_(
                CashDrawer.restaurant_id == data.restaurant_id,
                CashDrawer.is_open == True
            )
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="已有未关闭的现金抽屉")
    
    drawer = CashDrawer(
        restaurant_id=data.restaurant_id,
        terminal_id=data.terminal_id,
        opening_balance=data.opening_balance,
        current_balance=data.opening_balance,
        expected_balance=data.opening_balance,
        is_open=True,
        opened_by=data.opened_by,
        opened_at=datetime.utcnow()
    )
    db.add(drawer)
    
    # 记录开班交易
    transaction = CashTransaction(
        cash_drawer_id=drawer.id,
        transaction_type=CashTransactionType.OPENING,
        amount=data.opening_balance,
        staff_id=data.opened_by,
        reason="开班现金"
    )
    db.add(transaction)
    
    await db.commit()
    await db.refresh(drawer)
    return drawer


@router.post("/cash-drawer/{drawer_id}/close", response_model=CashDrawerResponse)
async def close_cash_drawer(
    drawer_id: str,
    data: CashDrawerClose,
    db: AsyncSession = Depends(get_db)
):
    """收班 - 关闭现金抽屉"""
    drawer = await db.get(CashDrawer, drawer_id)
    if not drawer:
        raise HTTPException(status_code=404, detail="现金抽屉不存在")
    
    if not drawer.is_open:
        raise HTTPException(status_code=400, detail="现金抽屉已关闭")
    
    drawer.is_open = False
    drawer.closed_by = data.closed_by
    drawer.closed_at = datetime.utcnow()
    drawer.current_balance = data.actual_balance
    drawer.variance = data.actual_balance - drawer.expected_balance
    drawer.variance_notes = data.variance_notes
    
    # 记录收班交易
    transaction = CashTransaction(
        cash_drawer_id=drawer_id,
        transaction_type=CashTransactionType.CLOSING,
        amount=data.actual_balance,
        staff_id=data.closed_by,
        reason=f"收班结算，差异: {drawer.variance}"
    )
    db.add(transaction)
    
    await db.commit()
    await db.refresh(drawer)
    return drawer


@router.get("/cash-drawer/current", response_model=CashDrawerResponse)
async def get_current_cash_drawer(
    restaurant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取当前打开的现金抽屉"""
    result = await db.execute(
        select(CashDrawer).where(
            and_(
                CashDrawer.restaurant_id == restaurant_id,
                CashDrawer.is_open == True
            )
        )
    )
    drawer = result.scalar_one_or_none()
    if not drawer:
        raise HTTPException(status_code=404, detail="没有打开的现金抽屉")
    return drawer


@router.post("/cash-drawer/{drawer_id}/pay-in", response_model=CashTransactionResponse)
async def cash_pay_in(
    drawer_id: str,
    amount: float,
    reason: str,
    staff_id: str,
    db: AsyncSession = Depends(get_db)
):
    """付入（如补充找零）"""
    drawer = await db.get(CashDrawer, drawer_id)
    if not drawer or not drawer.is_open:
        raise HTTPException(status_code=400, detail="现金抽屉未打开")
    
    transaction = CashTransaction(
        cash_drawer_id=drawer_id,
        transaction_type=CashTransactionType.PAY_IN,
        amount=amount,
        reason=reason,
        staff_id=staff_id
    )
    
    drawer.current_balance += amount
    drawer.expected_balance += amount
    
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction


@router.post("/cash-drawer/{drawer_id}/pay-out", response_model=CashTransactionResponse)
async def cash_pay_out(
    drawer_id: str,
    amount: float,
    reason: str,
    staff_id: str,
    db: AsyncSession = Depends(get_db)
):
    """付出（如购买小额物品）"""
    drawer = await db.get(CashDrawer, drawer_id)
    if not drawer or not drawer.is_open:
        raise HTTPException(status_code=400, detail="现金抽屉未打开")
    
    if amount > drawer.current_balance:
        raise HTTPException(status_code=400, detail="现金余额不足")
    
    transaction = CashTransaction(
        cash_drawer_id=drawer_id,
        transaction_type=CashTransactionType.PAY_OUT,
        amount=amount,
        reason=reason,
        staff_id=staff_id
    )
    
    drawer.current_balance -= amount
    drawer.expected_balance -= amount
    
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction


@router.post("/cash-drawer/{drawer_id}/blind-drop", response_model=CashTransactionResponse)
async def cash_blind_drop(
    drawer_id: str,
    amount: float,
    staff_id: str,
    db: AsyncSession = Depends(get_db)
):
    """盲投（将大额现金投入保险箱）"""
    drawer = await db.get(CashDrawer, drawer_id)
    if not drawer or not drawer.is_open:
        raise HTTPException(status_code=400, detail="现金抽屉未打开")
    
    if amount > drawer.current_balance:
        raise HTTPException(status_code=400, detail="现金余额不足")
    
    transaction = CashTransaction(
        cash_drawer_id=drawer_id,
        transaction_type=CashTransactionType.BLIND_DROP,
        amount=amount,
        reason="盲投到保险箱",
        staff_id=staff_id
    )
    
    drawer.current_balance -= amount
    drawer.expected_balance -= amount
    
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction


@router.get("/cash-drawer/{drawer_id}/transactions", response_model=List[CashTransactionResponse])
async def get_cash_transactions(
    drawer_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取现金抽屉的所有交易记录"""
    result = await db.execute(
        select(CashTransaction)
        .where(CashTransaction.cash_drawer_id == drawer_id)
        .order_by(CashTransaction.created_at)
    )
    return result.scalars().all()


# ============ 折扣管理 ============

@router.get("/discounts", response_model=List[DiscountResponse])
async def get_discounts(
    restaurant_id: str,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """获取折扣列表"""
    query = select(Discount).where(Discount.restaurant_id == restaurant_id)
    if active_only:
        query = query.where(Discount.is_active == True)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/discounts", response_model=DiscountResponse, status_code=status.HTTP_201_CREATED)
async def create_discount(
    data: DiscountCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建折扣"""
    discount = Discount(**data.model_dump())
    db.add(discount)
    await db.commit()
    await db.refresh(discount)
    return discount


@router.put("/discounts/{discount_id}", response_model=DiscountResponse)
async def update_discount(
    discount_id: str,
    data: DiscountUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新折扣"""
    discount = await db.get(Discount, discount_id)
    if not discount:
        raise HTTPException(status_code=404, detail="折扣不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(discount, key, value)
    
    await db.commit()
    await db.refresh(discount)
    return discount


@router.post("/discounts/apply", response_model=ApplyDiscountResponse)
async def apply_discount(
    data: ApplyDiscountRequest,
    db: AsyncSession = Depends(get_db)
):
    """应用折扣到订单"""
    order = await db.get(Order, data.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    # 查找折扣
    discount = None
    if data.discount_code:
        result = await db.execute(
            select(Discount).where(
                and_(
                    Discount.code == data.discount_code,
                    Discount.is_active == True
                )
            )
        )
        discount = result.scalar_one_or_none()
    elif data.discount_id:
        discount = await db.get(Discount, data.discount_id)
    
    if not discount:
        raise HTTPException(status_code=404, detail="折扣不存在或已过期")
    
    # 验证使用条件
    if discount.min_order_amount and order.subtotal < discount.min_order_amount:
        raise HTTPException(status_code=400, detail=f"订单金额需达到 ${discount.min_order_amount}")
    
    if discount.max_uses and discount.current_uses >= discount.max_uses:
        raise HTTPException(status_code=400, detail="折扣已达到使用上限")
    
    # 计算折扣金额
    discount_amount = 0.0
    if discount.discount_type == "percent":
        discount_amount = order.subtotal * (discount.discount_value / 100)
        if discount.max_discount:
            discount_amount = min(discount_amount, discount.max_discount)
    elif discount.discount_type == "fixed":
        discount_amount = min(discount.discount_value, order.subtotal)
    
    # 应用折扣
    order.discount = discount_amount
    order.discount_code = discount.code
    order.discount_reason = discount.name
    order.total = order.subtotal + order.tax + order.tip - order.discount + order.service_charge
    
    discount.current_uses += 1
    
    await db.commit()
    
    return ApplyDiscountResponse(
        order_id=order.id,
        discount_id=discount.id,
        discount_name=discount.name,
        discount_amount=discount_amount,
        new_total=order.total
    )


# ============ 服务费规则 ============

@router.get("/gratuities", response_model=List[GratuityResponse])
async def get_gratuities(
    restaurant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取自动服务费规则"""
    result = await db.execute(
        select(Gratuity).where(
            and_(
                Gratuity.restaurant_id == restaurant_id,
                Gratuity.is_active == True
            )
        )
    )
    return result.scalars().all()


@router.post("/gratuities", response_model=GratuityResponse, status_code=status.HTTP_201_CREATED)
async def create_gratuity(
    data: GratuityCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建自动服务费规则"""
    gratuity = Gratuity(**data.model_dump())
    db.add(gratuity)
    await db.commit()
    await db.refresh(gratuity)
    return gratuity


# ============ 班次汇总 ============

@router.get("/cash-drawer/{drawer_id}/summary", response_model=ShiftSummary)
async def get_shift_summary(
    drawer_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取班次收银汇总"""
    drawer = await db.get(CashDrawer, drawer_id)
    if not drawer:
        raise HTTPException(status_code=404, detail="现金抽屉不存在")
    
    # 获取该班次期间的所有支付
    payments_result = await db.execute(
        select(Payment).where(
            and_(
                Payment.restaurant_id == drawer.restaurant_id,
                Payment.created_at >= drawer.opened_at,
                Payment.created_at <= (drawer.closed_at or datetime.utcnow()),
                Payment.status == PaymentStatus.COMPLETED
            )
        )
    )
    payments = payments_result.scalars().all()
    
    # 获取退款
    refunds_result = await db.execute(
        select(Refund).where(
            and_(
                Refund.restaurant_id == drawer.restaurant_id,
                Refund.created_at >= drawer.opened_at,
                Refund.created_at <= (drawer.closed_at or datetime.utcnow()),
                Refund.status == RefundStatus.COMPLETED
            )
        )
    )
    refunds = refunds_result.scalars().all()
    
    # 获取现金交易
    transactions_result = await db.execute(
        select(CashTransaction).where(CashTransaction.cash_drawer_id == drawer_id)
    )
    transactions = transactions_result.scalars().all()
    
    # 计算汇总
    total_sales = sum(p.amount for p in payments)
    total_tips = sum(p.tip_amount for p in payments)
    total_refunds = sum(r.amount for r in refunds)
    
    cash_sales = sum(p.amount for p in payments if p.payment_method == PaymentMethod.CASH)
    card_sales = sum(p.amount for p in payments if p.payment_method in [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD])
    mobile_sales = sum(p.amount for p in payments if p.payment_method in [PaymentMethod.ALIPAY, PaymentMethod.WECHAT_PAY, PaymentMethod.APPLE_PAY])
    other_sales = total_sales - cash_sales - card_sales - mobile_sales
    
    pay_ins = len([t for t in transactions if t.transaction_type == CashTransactionType.PAY_IN])
    pay_outs = len([t for t in transactions if t.transaction_type == CashTransactionType.PAY_OUT])
    blind_drops = len([t for t in transactions if t.transaction_type == CashTransactionType.BLIND_DROP])
    
    return ShiftSummary(
        cash_drawer_id=drawer_id,
        shift_start=drawer.opened_at,
        shift_end=drawer.closed_at,
        total_sales=total_sales,
        total_orders=len(set(p.order_id for p in payments)),
        total_refunds=total_refunds,
        net_sales=total_sales - total_refunds,
        cash_sales=cash_sales,
        card_sales=card_sales,
        mobile_sales=mobile_sales,
        other_sales=other_sales,
        total_tips=total_tips,
        opening_balance=drawer.opening_balance,
        expected_cash=drawer.expected_balance,
        actual_cash=drawer.current_balance,
        variance=drawer.variance,
        pay_ins=pay_ins,
        pay_outs=pay_outs,
        blind_drops=blind_drops
    )
