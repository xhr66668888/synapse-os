"""
员工排班与考勤模型 - 排班表、打卡、小费分配
"""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, ForeignKey, Text, Enum, Date, Time
from sqlalchemy.orm import relationship
from datetime import datetime, date, time
import uuid
import enum

from app.database import Base


class ShiftStatus(str, enum.Enum):
    """班次状态"""
    SCHEDULED = "scheduled"  # 已排班
    CONFIRMED = "confirmed"  # 已确认
    IN_PROGRESS = "in_progress"  # 进行中
    COMPLETED = "completed"  # 已完成
    NO_SHOW = "no_show"  # 缺勤
    CANCELLED = "cancelled"  # 已取消


class TimeOffType(str, enum.Enum):
    """请假类型"""
    VACATION = "vacation"  # 年假
    SICK = "sick"  # 病假
    PERSONAL = "personal"  # 事假
    UNPAID = "unpaid"  # 无薪假
    OTHER = "other"


class TimeOffStatus(str, enum.Enum):
    """请假状态"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class TipDistributionMethod(str, enum.Enum):
    """小费分配方式"""
    EQUAL = "equal"  # 平均分配
    BY_HOURS = "by_hours"  # 按工作时长
    BY_ROLE = "by_role"  # 按角色比例
    BY_SALES = "by_sales"  # 按销售额
    CUSTOM = "custom"  # 自定义


class Schedule(Base):
    """排班表模型"""
    __tablename__ = "schedules"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    staff_id = Column(String(36), ForeignKey("staff.id"), nullable=False)
    
    # 排班信息
    schedule_date = Column(Date, nullable=False)
    shift_start = Column(Time, nullable=False)
    shift_end = Column(Time, nullable=False)
    
    # 角色（可能与员工默认角色不同）
    role = Column(String(50), nullable=True)
    
    # 工作站/区域
    station = Column(String(50), nullable=True)  # 如：Bar, Kitchen, Floor
    
    # 状态
    status = Column(Enum(ShiftStatus), default=ShiftStatus.SCHEDULED)
    
    # 备注
    notes = Column(Text, nullable=True)
    
    # 发布状态
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime, nullable=True)
    
    # 创建/修改人
    created_by = Column(String(36), ForeignKey("staff.id"), nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", backref="schedules")
    staff = relationship("Staff", foreign_keys=[staff_id], backref="schedules")
    creator = relationship("Staff", foreign_keys=[created_by])


class TimeEntry(Base):
    """考勤打卡记录模型"""
    __tablename__ = "time_entries"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    staff_id = Column(String(36), ForeignKey("staff.id"), nullable=False)
    schedule_id = Column(String(36), ForeignKey("schedules.id"), nullable=True)
    
    # 打卡时间
    clock_in = Column(DateTime, nullable=True)
    clock_out = Column(DateTime, nullable=True)
    
    # 计算的工作时间（分钟）
    total_minutes = Column(Integer, default=0)
    regular_minutes = Column(Integer, default=0)  # 常规工时
    overtime_minutes = Column(Integer, default=0)  # 加班工时
    
    # 休息
    break_start = Column(DateTime, nullable=True)
    break_end = Column(DateTime, nullable=True)
    break_minutes = Column(Integer, default=0)  # 休息时间（分钟）
    is_paid_break = Column(Boolean, default=False)  # 是否带薪休息
    
    # 薪资计算
    hourly_rate = Column(Float, nullable=True)
    overtime_rate = Column(Float, nullable=True)  # 加班倍率（如1.5）
    total_pay = Column(Float, default=0.0)
    
    # 小费
    tips_received = Column(Float, default=0.0)
    
    # 备注
    notes = Column(Text, nullable=True)
    
    # 审批
    is_approved = Column(Boolean, default=False)
    approved_by = Column(String(36), ForeignKey("staff.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", backref="time_entries")
    staff = relationship("Staff", foreign_keys=[staff_id], backref="time_entries")
    schedule = relationship("Schedule", backref="time_entry")
    approver = relationship("Staff", foreign_keys=[approved_by])


class TimeOff(Base):
    """请假申请模型"""
    __tablename__ = "time_off_requests"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    staff_id = Column(String(36), ForeignKey("staff.id"), nullable=False)
    
    # 请假信息
    time_off_type = Column(Enum(TimeOffType), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # 时间（可选，用于半天假）
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    
    # 请假天数/小时
    total_days = Column(Float, default=1.0)
    
    # 原因
    reason = Column(Text, nullable=True)
    
    # 状态
    status = Column(Enum(TimeOffStatus), default=TimeOffStatus.PENDING)
    
    # 审批
    reviewed_by = Column(String(36), ForeignKey("staff.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", backref="time_off_requests")
    staff = relationship("Staff", foreign_keys=[staff_id], backref="time_off_requests")
    reviewer = relationship("Staff", foreign_keys=[reviewed_by])


class TipPool(Base):
    """小费池模型 - 用于管理和分配小费"""
    __tablename__ = "tip_pools"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    
    # 池信息
    pool_date = Column(Date, nullable=False)
    shift = Column(String(20), nullable=True)  # lunch, dinner, all_day
    
    # 总小费
    total_tips = Column(Float, default=0.0)
    cash_tips = Column(Float, default=0.0)
    card_tips = Column(Float, default=0.0)
    
    # 分配方式
    distribution_method = Column(Enum(TipDistributionMethod), default=TipDistributionMethod.EQUAL)
    
    # 分配状态
    is_distributed = Column(Boolean, default=False)
    distributed_at = Column(DateTime, nullable=True)
    distributed_by = Column(String(36), ForeignKey("staff.id"), nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", backref="tip_pools")
    distributions = relationship("TipDistribution", back_populates="tip_pool", cascade="all, delete-orphan")
    distributor = relationship("Staff", foreign_keys=[distributed_by])


class TipDistribution(Base):
    """小费分配明细模型"""
    __tablename__ = "tip_distributions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tip_pool_id = Column(String(36), ForeignKey("tip_pools.id"), nullable=False)
    staff_id = Column(String(36), ForeignKey("staff.id"), nullable=False)
    time_entry_id = Column(String(36), ForeignKey("time_entries.id"), nullable=True)
    
    # 分配信息
    hours_worked = Column(Float, default=0.0)  # 工作时长
    tip_share = Column(Float, default=0.0)  # 分配比例（0-1）
    amount = Column(Float, default=0.0)  # 分配金额
    
    # 角色系数（按角色分配时使用）
    role_multiplier = Column(Float, default=1.0)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    tip_pool = relationship("TipPool", back_populates="distributions")
    staff = relationship("Staff", backref="tip_distributions")
    time_entry = relationship("TimeEntry", backref="tip_distribution")


class PayrollPeriod(Base):
    """工资周期模型"""
    __tablename__ = "payroll_periods"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    
    # 周期信息
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    
    # 状态
    status = Column(String(20), default="open")  # open, processing, closed
    
    # 汇总
    total_regular_hours = Column(Float, default=0.0)
    total_overtime_hours = Column(Float, default=0.0)
    total_wages = Column(Float, default=0.0)
    total_tips = Column(Float, default=0.0)
    total_payroll = Column(Float, default=0.0)
    
    # 处理
    processed_at = Column(DateTime, nullable=True)
    processed_by = Column(String(36), ForeignKey("staff.id"), nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", backref="payroll_periods")
    processor = relationship("Staff", foreign_keys=[processed_by])


class StaffPayroll(Base):
    """员工工资单模型"""
    __tablename__ = "staff_payrolls"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    payroll_period_id = Column(String(36), ForeignKey("payroll_periods.id"), nullable=False)
    staff_id = Column(String(36), ForeignKey("staff.id"), nullable=False)
    
    # 工时
    regular_hours = Column(Float, default=0.0)
    overtime_hours = Column(Float, default=0.0)
    
    # 薪资
    hourly_rate = Column(Float, default=0.0)
    overtime_rate = Column(Float, default=1.5)
    regular_pay = Column(Float, default=0.0)
    overtime_pay = Column(Float, default=0.0)
    total_wages = Column(Float, default=0.0)
    
    # 小费
    tips = Column(Float, default=0.0)
    
    # 扣款
    deductions = Column(Float, default=0.0)
    deduction_notes = Column(Text, nullable=True)
    
    # 总计
    gross_pay = Column(Float, default=0.0)
    net_pay = Column(Float, default=0.0)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    payroll_period = relationship("PayrollPeriod", backref="staff_payrolls")
    staff = relationship("Staff", backref="payrolls")
