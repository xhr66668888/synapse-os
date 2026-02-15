"""
支付相关 Pydantic Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

from app.models.payment import PaymentMethod, PaymentStatus, RefundStatus, CashTransactionType


# ============ Payment Schemas ============

class PaymentBase(BaseModel):
    amount: float = Field(..., gt=0, description="支付金额")
    payment_method: PaymentMethod
    tip_amount: float = Field(default=0.0, ge=0, description="小费金额")
    notes: Optional[str] = None


class PaymentCreate(PaymentBase):
    order_id: str
    restaurant_id: str
    processed_by: Optional[str] = None
    # 现金支付
    cash_received: Optional[float] = None
    # 卡支付 token（由前端 Stripe/Square SDK 生成）
    payment_token: Optional[str] = None


class PaymentUpdate(BaseModel):
    status: Optional[PaymentStatus] = None
    transaction_id: Optional[str] = None
    notes: Optional[str] = None


class PaymentResponse(PaymentBase):
    id: str
    order_id: str
    restaurant_id: str
    status: PaymentStatus
    transaction_id: Optional[str] = None
    processor: Optional[str] = None
    card_last_four: Optional[str] = None
    card_brand: Optional[str] = None
    cash_received: Optional[float] = None
    change_given: Optional[float] = None
    processed_by: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ Refund Schemas ============

class RefundReasonCode(str, Enum):
    WASTE = "waste"
    SPILLED = "spilled"
    COLD_FOOD = "cold_food"
    WRONG_ORDER = "wrong_order"
    CUSTOMER_COMPLAINT = "customer_complaint"
    OVERCHARGE = "overcharge"
    DUPLICATE = "duplicate"
    OTHER = "other"


class RefundCreate(BaseModel):
    payment_id: str
    amount: float = Field(..., gt=0, description="退款金额")
    reason: str = Field(..., min_length=1, description="退款原因")
    reason_code: Optional[RefundReasonCode] = None
    requested_by: str
    manager_pin: Optional[str] = Field(default=None, description="经理PIN（需要授权时）")


class RefundApprove(BaseModel):
    approved_by: str
    manager_pin: str


class RefundResponse(BaseModel):
    id: str
    payment_id: str
    order_id: str
    restaurant_id: str
    amount: float
    status: RefundStatus
    reason: str
    reason_code: Optional[str] = None
    refund_transaction_id: Optional[str] = None
    requested_by: str
    approved_by: Optional[str] = None
    created_at: datetime
    approved_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ Cash Drawer Schemas ============

class CashDrawerOpen(BaseModel):
    restaurant_id: str
    terminal_id: Optional[str] = None
    opening_balance: float = Field(..., ge=0, description="开班现金")
    opened_by: str


class CashDrawerClose(BaseModel):
    actual_balance: float = Field(..., ge=0, description="实际点算金额")
    closed_by: str
    variance_notes: Optional[str] = None


class CashDrawerResponse(BaseModel):
    id: str
    restaurant_id: str
    terminal_id: Optional[str] = None
    shift_id: Optional[str] = None
    opening_balance: float
    current_balance: float
    expected_balance: float
    is_open: bool
    opened_by: Optional[str] = None
    closed_by: Optional[str] = None
    opened_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    variance: float = 0.0
    variance_notes: Optional[str] = None

    class Config:
        from_attributes = True


# ============ Cash Transaction Schemas ============

class CashTransactionCreate(BaseModel):
    cash_drawer_id: str
    transaction_type: CashTransactionType
    amount: float
    reason: Optional[str] = None
    staff_id: str
    order_id: Optional[str] = None
    payment_id: Optional[str] = None


class CashTransactionResponse(BaseModel):
    id: str
    cash_drawer_id: str
    transaction_type: CashTransactionType
    amount: float
    order_id: Optional[str] = None
    payment_id: Optional[str] = None
    reason: Optional[str] = None
    staff_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Discount Schemas ============

class DiscountType(str, Enum):
    PERCENT = "percent"
    FIXED = "fixed"
    BOGO = "bogo"  # Buy One Get One


class DiscountBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    discount_type: DiscountType
    discount_value: float = Field(..., gt=0)
    max_discount: Optional[float] = None
    min_order_amount: float = 0.0
    min_item_count: int = 0
    applicable_items: Optional[List[str]] = None
    applicable_categories: Optional[List[str]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    days_of_week: int = 127
    max_uses: Optional[int] = None
    max_uses_per_customer: Optional[int] = None
    is_active: bool = True
    is_automatic: bool = False


class DiscountCreate(DiscountBase):
    restaurant_id: str


class DiscountUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    discount_value: Optional[float] = None
    max_discount: Optional[float] = None
    min_order_amount: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None


class DiscountResponse(DiscountBase):
    id: str
    restaurant_id: str
    current_uses: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApplyDiscountRequest(BaseModel):
    """应用折扣请求"""
    order_id: str
    discount_code: Optional[str] = None
    discount_id: Optional[str] = None


class ApplyDiscountResponse(BaseModel):
    """应用折扣响应"""
    order_id: str
    discount_id: str
    discount_name: str
    discount_amount: float
    new_total: float


# ============ Gratuity Schemas ============

class GratuityBase(BaseModel):
    name: str
    min_guest_count: int = 6
    min_order_amount: Optional[float] = None
    gratuity_percent: float = Field(..., gt=0, le=100)
    is_active: bool = True


class GratuityCreate(GratuityBase):
    restaurant_id: str


class GratuityResponse(GratuityBase):
    id: str
    restaurant_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============ 支付处理请求 ============

class ProcessPaymentRequest(BaseModel):
    """处理支付的完整请求"""
    order_id: str
    payments: List[PaymentCreate] = Field(..., min_length=1, description="支付列表（支持拆分支付）")


class ProcessPaymentResponse(BaseModel):
    """支付处理响应"""
    order_id: str
    total_paid: float
    remaining: float
    payments: List[PaymentResponse]
    status: str  # paid, partial, failed


# ============ 收银汇总 ============

class ShiftSummary(BaseModel):
    """班次收银汇总"""
    cash_drawer_id: str
    shift_start: datetime
    shift_end: Optional[datetime] = None
    
    # 销售汇总
    total_sales: float = 0.0
    total_orders: int = 0
    total_refunds: float = 0.0
    net_sales: float = 0.0
    
    # 按支付方式
    cash_sales: float = 0.0
    card_sales: float = 0.0
    mobile_sales: float = 0.0
    other_sales: float = 0.0
    
    # 小费
    total_tips: float = 0.0
    
    # 现金管理
    opening_balance: float = 0.0
    expected_cash: float = 0.0
    actual_cash: float = 0.0
    variance: float = 0.0
    
    # 交易明细计数
    pay_ins: int = 0
    pay_outs: int = 0
    blind_drops: int = 0
