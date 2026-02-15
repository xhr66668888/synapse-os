"""
员工排班与考勤 Pydantic Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date, time

from app.models.schedule import ShiftStatus, TimeOffType, TimeOffStatus, TipDistributionMethod


# ============ Schedule Schemas ============

class ScheduleBase(BaseModel):
    staff_id: str
    schedule_date: date
    shift_start: time
    shift_end: time
    role: Optional[str] = None
    station: Optional[str] = None
    notes: Optional[str] = None


class ScheduleCreate(ScheduleBase):
    restaurant_id: str
    created_by: Optional[str] = None


class ScheduleUpdate(BaseModel):
    schedule_date: Optional[date] = None
    shift_start: Optional[time] = None
    shift_end: Optional[time] = None
    role: Optional[str] = None
    station: Optional[str] = None
    status: Optional[ShiftStatus] = None
    notes: Optional[str] = None


class ScheduleResponse(ScheduleBase):
    id: str
    restaurant_id: str
    status: ShiftStatus
    is_published: bool = False
    published_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BulkScheduleCreate(BaseModel):
    """批量创建排班"""
    restaurant_id: str
    schedules: List[ScheduleCreate]
    created_by: Optional[str] = None


class PublishScheduleRequest(BaseModel):
    """发布排班请求"""
    start_date: date
    end_date: date
    notify_staff: bool = True


# ============ TimeEntry (打卡) Schemas ============

class ClockInRequest(BaseModel):
    restaurant_id: str
    staff_id: str
    schedule_id: Optional[str] = None
    notes: Optional[str] = None


class ClockOutRequest(BaseModel):
    notes: Optional[str] = None


class BreakRequest(BaseModel):
    is_paid: bool = False


class TimeEntryResponse(BaseModel):
    id: str
    restaurant_id: str
    staff_id: str
    schedule_id: Optional[str] = None
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    total_minutes: int = 0
    regular_minutes: int = 0
    overtime_minutes: int = 0
    break_start: Optional[datetime] = None
    break_end: Optional[datetime] = None
    break_minutes: int = 0
    is_paid_break: bool = False
    hourly_rate: Optional[float] = None
    total_pay: float = 0.0
    tips_received: float = 0.0
    notes: Optional[str] = None
    is_approved: bool = False
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TimeEntryUpdate(BaseModel):
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    break_minutes: Optional[int] = None
    notes: Optional[str] = None


class ApproveTimeEntryRequest(BaseModel):
    approved_by: str
    notes: Optional[str] = None


# ============ TimeOff (请假) Schemas ============

class TimeOffBase(BaseModel):
    time_off_type: TimeOffType
    start_date: date
    end_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    reason: Optional[str] = None


class TimeOffCreate(TimeOffBase):
    restaurant_id: str
    staff_id: str


class TimeOffResponse(TimeOffBase):
    id: str
    restaurant_id: str
    staff_id: str
    total_days: float = 1.0
    status: TimeOffStatus
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReviewTimeOffRequest(BaseModel):
    status: TimeOffStatus
    reviewed_by: str
    review_notes: Optional[str] = None


# ============ TipPool (小费池) Schemas ============

class TipPoolBase(BaseModel):
    pool_date: date
    shift: Optional[str] = None  # lunch, dinner, all_day
    total_tips: float = 0.0
    cash_tips: float = 0.0
    card_tips: float = 0.0
    distribution_method: TipDistributionMethod = TipDistributionMethod.EQUAL


class TipPoolCreate(TipPoolBase):
    restaurant_id: str


class TipPoolResponse(TipPoolBase):
    id: str
    restaurant_id: str
    is_distributed: bool = False
    distributed_at: Optional[datetime] = None
    distributed_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TipDistributionResponse(BaseModel):
    id: str
    tip_pool_id: str
    staff_id: str
    time_entry_id: Optional[str] = None
    hours_worked: float = 0.0
    tip_share: float = 0.0
    amount: float = 0.0
    role_multiplier: float = 1.0
    created_at: datetime

    class Config:
        from_attributes = True


class DistributeTipsRequest(BaseModel):
    """分配小费请求"""
    distributed_by: str
    # 可选：自定义分配（覆盖自动计算）
    custom_distributions: Optional[List[dict]] = None  # [{"staff_id": "xxx", "amount": 100.0}]


class TipPoolWithDistributions(TipPoolResponse):
    distributions: List[TipDistributionResponse] = []


# ============ Payroll (工资) Schemas ============

class PayrollPeriodCreate(BaseModel):
    restaurant_id: str
    period_start: date
    period_end: date


class PayrollPeriodResponse(BaseModel):
    id: str
    restaurant_id: str
    period_start: date
    period_end: date
    status: str
    total_regular_hours: float = 0.0
    total_overtime_hours: float = 0.0
    total_wages: float = 0.0
    total_tips: float = 0.0
    total_payroll: float = 0.0
    processed_at: Optional[datetime] = None
    processed_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StaffPayrollResponse(BaseModel):
    id: str
    payroll_period_id: str
    staff_id: str
    regular_hours: float = 0.0
    overtime_hours: float = 0.0
    hourly_rate: float = 0.0
    overtime_rate: float = 1.5
    regular_pay: float = 0.0
    overtime_pay: float = 0.0
    total_wages: float = 0.0
    tips: float = 0.0
    deductions: float = 0.0
    deduction_notes: Optional[str] = None
    gross_pay: float = 0.0
    net_pay: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True


# ============ 统计/报告 Schemas ============

class StaffScheduleSummary(BaseModel):
    """员工排班汇总"""
    staff_id: str
    staff_name: str
    total_shifts: int = 0
    total_hours: float = 0.0
    shifts_by_day: dict = {}  # {"Mon": 2, "Tue": 1, ...}


class WeeklyScheduleView(BaseModel):
    """周排班视图"""
    week_start: date
    week_end: date
    schedules_by_day: dict = {}  # {"2024-01-15": [ScheduleResponse, ...]}
    staff_summary: List[StaffScheduleSummary] = []


class LaborCostSummary(BaseModel):
    """人工成本汇总"""
    period_start: date
    period_end: date
    total_hours: float = 0.0
    total_wages: float = 0.0
    total_tips: float = 0.0
    total_labor_cost: float = 0.0
    labor_cost_percentage: float = 0.0  # 人工成本占销售额百分比
    average_hourly_cost: float = 0.0
    by_role: dict = {}  # {"SERVER": {"hours": 100, "cost": 1500}, ...}


class AttendanceSummary(BaseModel):
    """考勤汇总"""
    staff_id: str
    staff_name: str
    period_start: date
    period_end: date
    scheduled_shifts: int = 0
    completed_shifts: int = 0
    no_shows: int = 0
    late_arrivals: int = 0
    early_departures: int = 0
    total_scheduled_hours: float = 0.0
    total_worked_hours: float = 0.0
    attendance_rate: float = 0.0  # 出勤率
