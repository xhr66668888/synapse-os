"""
预订系统模型
"""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.database import Base


class ReservationStatus(str, enum.Enum):
    """预订状态"""
    PENDING = "pending"  # 待确认
    CONFIRMED = "confirmed"  # 已确认
    SEATED = "seated"  # 已入座
    COMPLETED = "completed"  # 已完成
    CANCELLED = "cancelled"  # 已取消
    NO_SHOW = "no_show"  # 未到店


class ReservationSource(str, enum.Enum):
    """预订来源"""
    PHONE = "phone"  # 电话预订
    WEBSITE = "website"  # 网站预订
    APP = "app"  # App预订
    WALK_IN = "walk_in"  # 现场预订
    AI_ASSISTANT = "ai_assistant"  # AI助手预订
    THIRD_PARTY = "third_party"  # 第三方平台


class Reservation(Base):
    """预订模型"""
    __tablename__ = "reservations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    customer_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # 预订信息
    confirmation_number = Column(String(20), unique=True, nullable=False)  # 确认号
    guest_name = Column(String(100), nullable=False)
    guest_phone = Column(String(20), nullable=False)
    guest_email = Column(String(100), nullable=True)
    guest_count = Column(Integer, nullable=False)  # 就餐人数
    
    # 时间
    reservation_date = Column(DateTime, nullable=False)  # 预订日期时间
    duration_minutes = Column(Integer, default=90)  # 预计用餐时长(分钟)
    
    # 桌位
    table_id = Column(String(36), ForeignKey("tables.id"), nullable=True)  # 分配的桌位
    preferred_section = Column(String(50), nullable=True)  # 偏好区域
    
    # 状态
    status = Column(Enum(ReservationStatus), default=ReservationStatus.PENDING)
    source = Column(Enum(ReservationSource), default=ReservationSource.PHONE)
    
    # 特殊要求
    special_requests = Column(Text, nullable=True)  # 特殊要求
    occasion = Column(String(50), nullable=True)  # 场合 (生日/纪念日/商务等)
    has_children = Column(Boolean, default=False)  # 是否有儿童
    needs_high_chair = Column(Boolean, default=False)  # 是否需要儿童座椅
    dietary_restrictions = Column(Text, nullable=True)  # 饮食限制
    
    # 提醒
    reminder_sent = Column(Boolean, default=False)  # 是否已发送提醒
    reminder_sent_at = Column(DateTime, nullable=True)
    
    # 操作记录
    created_by = Column(String(36), ForeignKey("staff.id"), nullable=True)  # 创建人
    confirmed_by = Column(String(36), ForeignKey("staff.id"), nullable=True)  # 确认人
    
    # 备注
    notes = Column(Text, nullable=True)  # 内部备注
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)
    seated_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    
    # 关系
    restaurant = relationship("Restaurant", backref="reservations")
    customer = relationship("User", backref="reservations")
    table = relationship("Table", backref="reservations")
    creator = relationship("Staff", foreign_keys=[created_by], backref="created_reservations")
    confirmer = relationship("Staff", foreign_keys=[confirmed_by], backref="confirmed_reservations")


class WaitlistEntry(Base):
    """等位队列模型"""
    __tablename__ = "waitlist_entries"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    
    # 客人信息
    guest_name = Column(String(100), nullable=False)
    guest_phone = Column(String(20), nullable=False)
    party_size = Column(Integer, nullable=False)  # 人数
    
    # 位置
    position = Column(Integer, nullable=False)  # 队列位置
    
    # 状态
    status = Column(String(20), default='waiting')  # waiting, called, seated, cancelled, no_show
    
    # 偏好
    preferred_section = Column(String(50), nullable=True)
    table_id = Column(String(36), ForeignKey("tables.id"), nullable=True)  # 分配的桌位
    
    # 预计等待时间(分钟)
    estimated_wait_minutes = Column(Integer, nullable=True)
    
    # 通知
    notification_sent = Column(Boolean, default=False)
    notification_sent_at = Column(DateTime, nullable=True)
    
    # 特殊需求
    has_children = Column(Boolean, default=False)
    needs_high_chair = Column(Boolean, default=False)
    special_requests = Column(Text, nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    called_at = Column(DateTime, nullable=True)  # 叫号时间
    seated_at = Column(DateTime, nullable=True)  # 入座时间
    cancelled_at = Column(DateTime, nullable=True)
    
    # 关系
    restaurant = relationship("Restaurant", backref="waitlist_entries")
    table = relationship("Table", backref="waitlist_entries")
