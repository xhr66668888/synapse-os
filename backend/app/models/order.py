from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, ForeignKey, Text, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.database import Base


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    VOID = "void"  # 作废（支付前取消）
    REFUNDED = "refunded"  # 已退款


class OrderType(str, enum.Enum):
    DINE_IN = "dine_in"
    TAKEOUT = "takeout"
    DELIVERY = "delivery"


class DeliveryPlatform(str, enum.Enum):
    DOORDASH = "doordash"
    UBEREATS = "ubereats"
    GRUBHUB = "grubhub"


class FireStatus(str, enum.Enum):
    """课程Fire状态"""
    HOLD = "hold"  # 暂缓
    FIRED = "fired"  # 已下单到厨房
    COMPLETED = "completed"  # 已完成


class Order(Base):
    """订单模型 - 支持分单、课程管理"""
    __tablename__ = "orders"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    customer_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    order_number = Column(String(20), nullable=False, index=True)
    order_type = Column(Enum(OrderType), default=OrderType.DINE_IN)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    
    # 分单支持
    parent_order_id = Column(String(36), ForeignKey("orders.id"), nullable=True)  # 父订单ID（用于分单）
    split_type = Column(String(20), nullable=True)  # 分单类型: by_seat, by_item, even
    
    # 课程管理
    current_course = Column(Integer, default=1)  # 当前课程号
    total_courses = Column(Integer, default=1)  # 总课程数
    
    # 金额
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    tip = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)  # 折扣金额
    service_charge = Column(Float, default=0.0)  # 服务费
    total = Column(Float, default=0.0)
    
    # 折扣/优惠
    discount_code = Column(String(50), nullable=True)  # 折扣码
    discount_reason = Column(String(200), nullable=True)  # 折扣原因
    
    # 备注
    notes = Column(Text, nullable=True)
    table_number = Column(String(10), nullable=True)
    guest_count = Column(Integer, default=1)  # 就餐人数
    
    # 外卖相关
    delivery_address = Column(String(500), nullable=True)
    delivery_platform = Column(Enum(DeliveryPlatform), nullable=True)
    
    # 服务员
    server_id = Column(String(36), ForeignKey("staff.id"), nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    fired_at = Column(DateTime, nullable=True)  # 首次Fire时间
    completed_at = Column(DateTime, nullable=True)  # 完成时间
    
    # 关系
    restaurant = relationship("Restaurant", back_populates="orders")
    customer = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    split_orders = relationship("Order", backref="parent_order", remote_side=[id])
    server = relationship("Staff", backref="served_orders")


class OrderItem(Base):
    """订单明细模型 - 支持座位号、课程管理"""
    __tablename__ = "order_items"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False)
    menu_item_id = Column(String(36), ForeignKey("menu_items.id"), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    
    # 修饰符选择（存储选中的ModifierOption ID列表）
    selected_modifiers = Column(JSON, nullable=True)  # [{"group_id": "xxx", "option_ids": ["yyy", "zzz"]}]
    taste_modifiers = Column(JSON, nullable=True)  # 向后兼容：旧版口味调整器
    modifier_price = Column(Float, default=0.0)  # 修饰符加价总计
    
    # 分单支持
    seat_number = Column(Integer, nullable=True)  # 座位号（用于按座位分单）
    
    # 课程管理
    course = Column(Integer, default=1)  # 课程号（1=前菜, 2=主菜, 3=甜点...）
    fire_status = Column(Enum(FireStatus), default=FireStatus.HOLD)  # Hold/Fired/Completed
    fired_at = Column(DateTime, nullable=True)  # Fire时间
    
    # 状态
    item_status = Column(String(20), default='pending')  # pending, preparing, ready, served, void
    void_reason = Column(String(200), nullable=True)  # 作废原因
    voided_by = Column(String(36), nullable=True)  # 作废操作人
    
    # 机器人相关
    assigned_robot_id = Column(String(50), nullable=True)
    robot_status = Column(String(20), default='pending')  # pending, cooking, completed, failed
    
    # 打印状态
    printed = Column(Boolean, default=False)  # 是否已打印到厨房
    print_count = Column(Integer, default=0)  # 打印次数
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem", back_populates="order_items")
