"""
审计日志模型 - 追踪系统中的所有关键操作
"""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, ForeignKey, Text, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.database import Base


class AuditAction(str, enum.Enum):
    """审计操作类型"""
    # 订单相关
    ORDER_CREATE = "order.create"
    ORDER_UPDATE = "order.update"
    ORDER_CANCEL = "order.cancel"
    ORDER_VOID = "order.void"
    ORDER_SPLIT = "order.split"
    ORDER_MERGE = "order.merge"
    ORDER_TRANSFER = "order.transfer"
    
    # 支付相关
    PAYMENT_PROCESS = "payment.process"
    PAYMENT_REFUND = "payment.refund"
    PAYMENT_VOID = "payment.void"
    
    # 菜单相关
    MENU_ITEM_CREATE = "menu_item.create"
    MENU_ITEM_UPDATE = "menu_item.update"
    MENU_ITEM_DELETE = "menu_item.delete"
    MENU_ITEM_86 = "menu_item.86"
    MENU_PRICE_CHANGE = "menu_item.price_change"
    
    # 折扣相关
    DISCOUNT_APPLY = "discount.apply"
    DISCOUNT_CREATE = "discount.create"
    DISCOUNT_UPDATE = "discount.update"
    
    # 库存相关
    INVENTORY_ADJUST = "inventory.adjust"
    INVENTORY_PURCHASE = "inventory.purchase"
    INVENTORY_COUNT = "inventory.count"
    
    # 现金相关
    CASH_DRAWER_OPEN = "cash_drawer.open"
    CASH_DRAWER_CLOSE = "cash_drawer.close"
    CASH_PAY_IN = "cash.pay_in"
    CASH_PAY_OUT = "cash.pay_out"
    CASH_BLIND_DROP = "cash.blind_drop"
    
    # 员工相关
    STAFF_CLOCK_IN = "staff.clock_in"
    STAFF_CLOCK_OUT = "staff.clock_out"
    STAFF_CREATE = "staff.create"
    STAFF_UPDATE = "staff.update"
    STAFF_PERMISSION_CHANGE = "staff.permission_change"
    
    # 系统相关
    SETTINGS_UPDATE = "settings.update"
    LOGIN = "auth.login"
    LOGOUT = "auth.logout"
    LOGIN_FAILED = "auth.login_failed"
    PASSWORD_CHANGE = "auth.password_change"
    
    # 其他
    CUSTOM = "custom"


class AuditSeverity(str, enum.Enum):
    """审计严重级别"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AuditLog(Base):
    """审计日志模型"""
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=True)
    
    # 操作信息
    action = Column(Enum(AuditAction), nullable=False)
    severity = Column(Enum(AuditSeverity), default=AuditSeverity.INFO)
    description = Column(String(500), nullable=True)
    
    # 实体信息
    entity_type = Column(String(50), nullable=True)  # order, payment, menu_item, etc.
    entity_id = Column(String(36), nullable=True)
    
    # 变更数据
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    
    # 元数据
    metadata = Column(JSON, nullable=True)  # 额外信息
    
    # 操作人
    staff_id = Column(String(36), ForeignKey("staff.id"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # 请求信息
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # 授权信息
    required_manager_approval = Column(Boolean, default=False)
    manager_id = Column(String(36), ForeignKey("staff.id"), nullable=True)
    manager_pin_used = Column(Boolean, default=False)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # 关系
    restaurant = relationship("Restaurant", backref="audit_logs")
    staff = relationship("Staff", foreign_keys=[staff_id], backref="performed_actions")
    manager = relationship("Staff", foreign_keys=[manager_id], backref="authorized_actions")
    user = relationship("User", backref="audit_logs")


class SystemLog(Base):
    """系统日志模型 - 用于记录系统级别事件"""
    __tablename__ = "system_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 日志级别
    level = Column(String(20), nullable=False)  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    
    # 日志信息
    logger = Column(String(100), nullable=True)  # 日志来源
    message = Column(Text, nullable=False)
    
    # 异常信息
    exception_type = Column(String(100), nullable=True)
    exception_message = Column(Text, nullable=True)
    stack_trace = Column(Text, nullable=True)
    
    # 请求信息
    request_id = Column(String(36), nullable=True)
    path = Column(String(500), nullable=True)
    method = Column(String(10), nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
