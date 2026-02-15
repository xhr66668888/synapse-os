from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from app.models.order import OrderStatus, OrderType, DeliveryPlatform, FireStatus


# ============ 修饰符选择 Schema ============

class ModifierSelection(BaseModel):
    """修饰符选择"""
    group_id: str
    option_ids: List[str]


# ============ OrderItem Schemas ============

class OrderItemBase(BaseModel):
    menu_item_id: str
    quantity: int = 1
    unit_price: float
    notes: Optional[str] = None
    taste_modifiers: Optional[Dict[str, Any]] = None  # 向后兼容
    selected_modifiers: Optional[List[ModifierSelection]] = None  # 新版修饰符选择
    seat_number: Optional[int] = None  # 座位号
    course: int = 1  # 课程号


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemUpdate(BaseModel):
    quantity: Optional[int] = None
    notes: Optional[str] = None
    seat_number: Optional[int] = None
    course: Optional[int] = None
    fire_status: Optional[FireStatus] = None


class OrderItemResponse(OrderItemBase):
    id: str
    order_id: str
    total_price: float
    modifier_price: float = 0.0
    fire_status: FireStatus = FireStatus.HOLD
    item_status: str = "pending"
    printed: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Order Schemas ============

class OrderBase(BaseModel):
    order_type: OrderType = OrderType.DINE_IN
    notes: Optional[str] = None
    table_number: Optional[str] = None
    guest_count: int = 1
    delivery_address: Optional[str] = None
    delivery_platform: Optional[DeliveryPlatform] = None


class OrderCreate(OrderBase):
    restaurant_id: str
    customer_id: Optional[str] = None
    server_id: Optional[str] = None
    items: List[OrderItemCreate]
    tip: float = 0.0
    discount_code: Optional[str] = None


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    notes: Optional[str] = None
    table_number: Optional[str] = None
    guest_count: Optional[int] = None
    tip: Optional[float] = None
    discount: Optional[float] = None
    discount_reason: Optional[str] = None
    server_id: Optional[str] = None


class OrderResponse(OrderBase):
    id: str
    restaurant_id: str
    customer_id: Optional[str]
    order_number: str
    status: OrderStatus
    parent_order_id: Optional[str] = None
    split_type: Optional[str] = None
    current_course: int = 1
    total_courses: int = 1
    subtotal: float
    tax: float
    tip: float
    discount: float = 0.0
    service_charge: float = 0.0
    total: float
    server_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    fired_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True


class OrderSummary(BaseModel):
    """订单摘要，用于列表展示"""
    id: str
    order_number: str
    order_type: OrderType
    status: OrderStatus
    total: float
    item_count: int
    table_number: Optional[str]
    guest_count: int = 1
    current_course: int = 1
    created_at: datetime

    class Config:
        from_attributes = True


# ============ 分单相关 Schemas ============

class SplitType(str, Enum):
    BY_SEAT = "by_seat"  # 按座位分单
    BY_ITEM = "by_item"  # 按菜品分单
    EVEN = "even"  # 平均分单


class SplitBySeatsRequest(BaseModel):
    """按座位分单请求"""
    seats: List[int] = Field(..., description="要分出的座位号列表")


class SplitByItemsRequest(BaseModel):
    """按菜品分单请求"""
    item_ids: List[str] = Field(..., description="要分出的菜品ID列表")


class SplitEvenRequest(BaseModel):
    """平均分单请求"""
    split_count: int = Field(..., ge=2, description="分成几份")


class MergeOrdersRequest(BaseModel):
    """合单请求"""
    order_ids: List[str] = Field(..., min_length=2, description="要合并的订单ID列表")


class TransferTableRequest(BaseModel):
    """转台请求"""
    new_table_number: str = Field(..., description="新桌号")


class FireCourseRequest(BaseModel):
    """Fire课程请求"""
    course: Optional[int] = Field(default=None, description="要Fire的课程号，不指定则Fire下一课程")


class VoidItemRequest(BaseModel):
    """作废菜品请求"""
    reason: str = Field(..., description="作废原因")
    manager_pin: Optional[str] = Field(default=None, description="经理PIN（如需授权）")


class AddItemsRequest(BaseModel):
    """追加菜品请求"""
    items: List[OrderItemCreate]


# ============ 响应 Schemas ============

class SplitOrderResponse(BaseModel):
    """分单响应"""
    original_order: OrderResponse
    split_orders: List[OrderResponse]


class OrderWithSplits(OrderResponse):
    """包含子订单的订单响应"""
    split_orders: List[OrderResponse] = []
