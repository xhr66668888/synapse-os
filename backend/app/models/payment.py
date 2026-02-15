"""
支付相关模型 - 支持多种支付方式、现金管理、退款
"""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, ForeignKey, Text, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.database import Base


class PaymentMethod(str, enum.Enum):
    """支付方式"""
    CASH = "cash"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    MOBILE_PAY = "mobile_pay"  # 通用移动支付
    ALIPAY = "alipay"
    WECHAT_PAY = "wechat_pay"
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"
    GIFT_CARD = "gift_card"
    STORE_CREDIT = "store_credit"
    OTHER = "other"


class PaymentStatus(str, enum.Enum):
    """支付状态"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PARTIAL_REFUND = "partial_refund"


class RefundStatus(str, enum.Enum):
    """退款状态"""
    PENDING = "pending"
    APPROVED = "approved"
    PROCESSING = "processing"
    COMPLETED = "completed"
    REJECTED = "rejected"


class CashTransactionType(str, enum.Enum):
    """现金交易类型"""
    OPENING = "opening"  # 开班现金
    SALE = "sale"  # 销售收款
    PAY_IN = "pay_in"  # 付入（如找零补充）
    PAY_OUT = "pay_out"  # 付出（如购买小额物品）
    BLIND_DROP = "blind_drop"  # 盲投（将大额现金投入保险箱）
    CLOSING = "closing"  # 收班结算


class Payment(Base):
    """支付记录模型"""
    __tablename__ = "payments"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    
    # 支付信息
    amount = Column(Float, nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    
    # 第三方交易信息
    transaction_id = Column(String(100), nullable=True)  # 第三方交易ID
    processor = Column(String(50), nullable=True)  # 支付处理商 (stripe, square, etc.)
    processor_response = Column(JSON, nullable=True)  # 处理商返回的原始数据
    
    # 卡支付信息（脱敏）
    card_last_four = Column(String(4), nullable=True)
    card_brand = Column(String(20), nullable=True)  # visa, mastercard, amex, etc.
    
    # 小费（如果单独收取）
    tip_amount = Column(Float, default=0.0)
    
    # 现金支付详情
    cash_received = Column(Float, nullable=True)  # 收到的现金
    change_given = Column(Float, nullable=True)  # 找零
    
    # 操作人
    processed_by = Column(String(36), ForeignKey("staff.id"), nullable=True)
    
    # 备注
    notes = Column(Text, nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # 关系
    order = relationship("Order", backref="payments")
    restaurant = relationship("Restaurant", backref="payments")
    processor_staff = relationship("Staff", backref="processed_payments")


class Refund(Base):
    """退款记录模型"""
    __tablename__ = "refunds"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    payment_id = Column(String(36), ForeignKey("payments.id"), nullable=False)
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    
    # 退款金额
    amount = Column(Float, nullable=False)
    
    # 退款状态
    status = Column(Enum(RefundStatus), default=RefundStatus.PENDING)
    
    # 退款原因
    reason = Column(String(200), nullable=False)
    reason_code = Column(String(50), nullable=True)  # 标准原因代码: waste, spilled, cold_food, wrong_order, etc.
    
    # 第三方退款信息
    refund_transaction_id = Column(String(100), nullable=True)
    processor_response = Column(JSON, nullable=True)
    
    # 审批信息
    requested_by = Column(String(36), ForeignKey("staff.id"), nullable=False)
    approved_by = Column(String(36), ForeignKey("staff.id"), nullable=True)
    manager_pin_used = Column(Boolean, default=False)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # 关系
    payment = relationship("Payment", backref="refunds")
    order = relationship("Order", backref="refunds")
    requester = relationship("Staff", foreign_keys=[requested_by], backref="requested_refunds")
    approver = relationship("Staff", foreign_keys=[approved_by], backref="approved_refunds")


class CashDrawer(Base):
    """现金抽屉模型"""
    __tablename__ = "cash_drawers"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    
    # 终端/工作站标识
    terminal_id = Column(String(50), nullable=True)
    
    # 班次信息
    shift_id = Column(String(36), nullable=True)
    
    # 金额
    opening_balance = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    expected_balance = Column(Float, default=0.0)  # 系统计算的应有金额
    
    # 状态
    is_open = Column(Boolean, default=False)
    
    # 操作人
    opened_by = Column(String(36), ForeignKey("staff.id"), nullable=True)
    closed_by = Column(String(36), ForeignKey("staff.id"), nullable=True)
    
    # 时间戳
    opened_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    
    # 结算差异
    variance = Column(Float, default=0.0)  # 实际 - 预期
    variance_notes = Column(Text, nullable=True)
    
    # 关系
    restaurant = relationship("Restaurant", backref="cash_drawers")
    opener = relationship("Staff", foreign_keys=[opened_by], backref="opened_drawers")
    closer = relationship("Staff", foreign_keys=[closed_by], backref="closed_drawers")


class CashTransaction(Base):
    """现金交易记录模型"""
    __tablename__ = "cash_transactions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cash_drawer_id = Column(String(36), ForeignKey("cash_drawers.id"), nullable=False)
    
    # 交易类型
    transaction_type = Column(Enum(CashTransactionType), nullable=False)
    
    # 金额
    amount = Column(Float, nullable=False)
    
    # 关联订单（如果是销售）
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=True)
    payment_id = Column(String(36), ForeignKey("payments.id"), nullable=True)
    
    # 原因（对于 pay_in, pay_out, blind_drop）
    reason = Column(String(200), nullable=True)
    
    # 操作人
    staff_id = Column(String(36), ForeignKey("staff.id"), nullable=False)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    cash_drawer = relationship("CashDrawer", backref="transactions")
    staff = relationship("Staff", backref="cash_transactions")
    order = relationship("Order", backref="cash_transactions")
    payment = relationship("Payment", backref="cash_transactions")


class Discount(Base):
    """折扣/优惠模型"""
    __tablename__ = "discounts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    
    # 折扣信息
    name = Column(String(100), nullable=False)  # 如 "Happy Hour", "员工餐", "生日优惠"
    code = Column(String(50), nullable=True, unique=True)  # 折扣码
    description = Column(Text, nullable=True)
    
    # 折扣类型和金额
    discount_type = Column(String(20), nullable=False)  # percent, fixed, bogo
    discount_value = Column(Float, nullable=False)  # 百分比或固定金额
    max_discount = Column(Float, nullable=True)  # 最大折扣金额（用于百分比折扣）
    
    # 适用条件
    min_order_amount = Column(Float, default=0.0)  # 最低消费
    min_item_count = Column(Integer, default=0)  # 最少商品数
    
    # 适用范围
    applicable_items = Column(JSON, nullable=True)  # 适用的菜品ID列表，null表示全部适用
    applicable_categories = Column(JSON, nullable=True)  # 适用的分类ID列表
    
    # 时间限制
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    start_time = Column(String(5), nullable=True)  # "HH:MM" 每日开始时间
    end_time = Column(String(5), nullable=True)  # "HH:MM" 每日结束时间
    days_of_week = Column(Integer, default=127)  # 位掩码
    
    # 使用限制
    max_uses = Column(Integer, nullable=True)  # 总使用次数限制
    max_uses_per_customer = Column(Integer, nullable=True)  # 每客户使用次数
    current_uses = Column(Integer, default=0)  # 当前已使用次数
    
    # 状态
    is_active = Column(Boolean, default=True)
    is_automatic = Column(Boolean, default=False)  # 是否自动应用（如Happy Hour）
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", backref="discounts")


class Gratuity(Base):
    """自动服务费/小费规则模型"""
    __tablename__ = "gratuities"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    
    # 规则名称
    name = Column(String(100), nullable=False)  # 如 "大桌服务费"
    
    # 触发条件
    min_guest_count = Column(Integer, default=6)  # 最少人数
    min_order_amount = Column(Float, nullable=True)  # 最低消费
    
    # 服务费
    gratuity_percent = Column(Float, nullable=False)  # 服务费百分比（如 18%）
    
    # 状态
    is_active = Column(Boolean, default=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", backref="gratuity_rules")
