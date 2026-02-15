"""
员工排班与考勤 API
支持排班管理、打卡、请假、小费分配
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, date, time, timedelta

from app.database import get_db
from app.config import get_settings
from app.models.schedule import (
    Schedule, ShiftStatus, TimeEntry, TimeOff, TimeOffStatus,
    TipPool, TipDistribution, TipDistributionMethod,
    PayrollPeriod, StaffPayroll
)
from app.models.staff import Staff
from app.schemas.schedule import (
    ScheduleCreate, ScheduleUpdate, ScheduleResponse,
    BulkScheduleCreate, PublishScheduleRequest,
    ClockInRequest, ClockOutRequest, BreakRequest, TimeEntryResponse,
    TimeEntryUpdate, ApproveTimeEntryRequest,
    TimeOffCreate, TimeOffResponse, ReviewTimeOffRequest,
    TipPoolCreate, TipPoolResponse, TipDistributionResponse,
    DistributeTipsRequest, TipPoolWithDistributions,
    PayrollPeriodCreate, PayrollPeriodResponse, StaffPayrollResponse,
    WeeklyScheduleView, LaborCostSummary, AttendanceSummary
)

router = APIRouter()
settings = get_settings()


# ============ 排班管理 ============

@router.get("/schedules", response_model=List[ScheduleResponse])
async def get_schedules(
    restaurant_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    staff_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取排班列表"""
    query = select(Schedule).where(Schedule.restaurant_id == restaurant_id)
    
    if start_date:
        query = query.where(Schedule.schedule_date >= start_date)
    if end_date:
        query = query.where(Schedule.schedule_date <= end_date)
    if staff_id:
        query = query.where(Schedule.staff_id == staff_id)
    
    query = query.order_by(Schedule.schedule_date, Schedule.shift_start)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/schedules/weekly", response_model=WeeklyScheduleView)
async def get_weekly_schedule(
    restaurant_id: str,
    week_start: date,
    db: AsyncSession = Depends(get_db)
):
    """获取周排班视图"""
    week_end = week_start + timedelta(days=6)
    
    result = await db.execute(
        select(Schedule).where(
            and_(
                Schedule.restaurant_id == restaurant_id,
                Schedule.schedule_date >= week_start,
                Schedule.schedule_date <= week_end
            )
        ).order_by(Schedule.schedule_date, Schedule.shift_start)
    )
    schedules = result.scalars().all()
    
    # 按日期分组
    schedules_by_day = {}
    for sch in schedules:
        date_str = sch.schedule_date.isoformat()
        if date_str not in schedules_by_day:
            schedules_by_day[date_str] = []
        schedules_by_day[date_str].append(ScheduleResponse.model_validate(sch))
    
    return WeeklyScheduleView(
        week_start=week_start,
        week_end=week_end,
        schedules_by_day=schedules_by_day,
        staff_summary=[]
    )


@router.post("/schedules", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    data: ScheduleCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建排班"""
    # 验证员工存在
    staff = await db.get(Staff, data.staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="员工不存在")
    
    # 检查是否有冲突
    existing = await db.execute(
        select(Schedule).where(
            and_(
                Schedule.staff_id == data.staff_id,
                Schedule.schedule_date == data.schedule_date,
                Schedule.status != ShiftStatus.CANCELLED
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="该员工在此日期已有排班")
    
    schedule = Schedule(**data.model_dump())
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return schedule


@router.post("/schedules/bulk", response_model=List[ScheduleResponse], status_code=status.HTTP_201_CREATED)
async def create_bulk_schedules(
    data: BulkScheduleCreate,
    db: AsyncSession = Depends(get_db)
):
    """批量创建排班"""
    schedules = []
    for sch_data in data.schedules:
        schedule = Schedule(
            **sch_data.model_dump(),
            created_by=data.created_by
        )
        db.add(schedule)
        schedules.append(schedule)
    
    await db.commit()
    
    for sch in schedules:
        await db.refresh(sch)
    
    return schedules


@router.put("/schedules/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: str,
    data: ScheduleUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新排班"""
    schedule = await db.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="排班不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(schedule, key, value)
    
    await db.commit()
    await db.refresh(schedule)
    return schedule


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除排班"""
    schedule = await db.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="排班不存在")
    
    schedule.status = ShiftStatus.CANCELLED
    await db.commit()


@router.post("/schedules/publish", status_code=status.HTTP_200_OK)
async def publish_schedules(
    data: PublishScheduleRequest,
    restaurant_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """发布排班"""
    result = await db.execute(
        select(Schedule).where(
            and_(
                Schedule.restaurant_id == restaurant_id,
                Schedule.schedule_date >= data.start_date,
                Schedule.schedule_date <= data.end_date,
                Schedule.is_published == False
            )
        )
    )
    schedules = result.scalars().all()
    
    now = datetime.utcnow()
    for sch in schedules:
        sch.is_published = True
        sch.published_at = now
    
    await db.commit()
    
    # 发送通知
    if data.notify_staff:
        try:
            redis = request.app.state.redis
            await redis.publish("schedule:published", f"{restaurant_id}:{data.start_date}:{data.end_date}")
        except Exception:
            pass
    
    return {"message": f"已发布 {len(schedules)} 个排班", "count": len(schedules)}


# ============ 打卡管理 ============

@router.post("/clock-in", response_model=TimeEntryResponse)
async def clock_in(
    data: ClockInRequest,
    db: AsyncSession = Depends(get_db)
):
    """上班打卡"""
    # 验证员工
    staff = await db.get(Staff, data.staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="员工不存在")
    
    # 检查是否已打卡
    today = date.today()
    existing = await db.execute(
        select(TimeEntry).where(
            and_(
                TimeEntry.staff_id == data.staff_id,
                func.date(TimeEntry.clock_in) == today,
                TimeEntry.clock_out == None
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="已有未完成的打卡记录")
    
    time_entry = TimeEntry(
        restaurant_id=data.restaurant_id,
        staff_id=data.staff_id,
        schedule_id=data.schedule_id,
        clock_in=datetime.utcnow(),
        hourly_rate=staff.hourly_rate,
        notes=data.notes
    )
    
    db.add(time_entry)
    await db.commit()
    await db.refresh(time_entry)
    return time_entry


@router.post("/clock-out/{entry_id}", response_model=TimeEntryResponse)
async def clock_out(
    entry_id: str,
    data: ClockOutRequest,
    db: AsyncSession = Depends(get_db)
):
    """下班打卡"""
    entry = await db.get(TimeEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="打卡记录不存在")
    
    if entry.clock_out:
        raise HTTPException(status_code=400, detail="已经打卡下班")
    
    entry.clock_out = datetime.utcnow()
    entry.notes = data.notes
    
    # 计算工作时间
    if entry.clock_in:
        total_minutes = int((entry.clock_out - entry.clock_in).total_seconds() / 60)
        total_minutes -= entry.break_minutes if not entry.is_paid_break else 0
        
        entry.total_minutes = max(0, total_minutes)
        
        # 加班计算（假设8小时以上为加班）
        regular_limit = 8 * 60  # 480分钟
        if entry.total_minutes > regular_limit:
            entry.regular_minutes = regular_limit
            entry.overtime_minutes = entry.total_minutes - regular_limit
        else:
            entry.regular_minutes = entry.total_minutes
            entry.overtime_minutes = 0
        
        # 计算工资
        if entry.hourly_rate:
            regular_pay = (entry.regular_minutes / 60) * entry.hourly_rate
            overtime_pay = (entry.overtime_minutes / 60) * entry.hourly_rate * 1.5
            entry.total_pay = regular_pay + overtime_pay
    
    await db.commit()
    await db.refresh(entry)
    return entry


@router.post("/break/start/{entry_id}", response_model=TimeEntryResponse)
async def start_break(
    entry_id: str,
    data: BreakRequest,
    db: AsyncSession = Depends(get_db)
):
    """开始休息"""
    entry = await db.get(TimeEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="打卡记录不存在")
    
    if entry.break_start and not entry.break_end:
        raise HTTPException(status_code=400, detail="已在休息中")
    
    entry.break_start = datetime.utcnow()
    entry.is_paid_break = data.is_paid
    
    await db.commit()
    await db.refresh(entry)
    return entry


@router.post("/break/end/{entry_id}", response_model=TimeEntryResponse)
async def end_break(
    entry_id: str,
    db: AsyncSession = Depends(get_db)
):
    """结束休息"""
    entry = await db.get(TimeEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="打卡记录不存在")
    
    if not entry.break_start or entry.break_end:
        raise HTTPException(status_code=400, detail="没有进行中的休息")
    
    entry.break_end = datetime.utcnow()
    entry.break_minutes = int((entry.break_end - entry.break_start).total_seconds() / 60)
    
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/time-entries", response_model=List[TimeEntryResponse])
async def get_time_entries(
    restaurant_id: str,
    staff_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取打卡记录"""
    query = select(TimeEntry).where(TimeEntry.restaurant_id == restaurant_id)
    
    if staff_id:
        query = query.where(TimeEntry.staff_id == staff_id)
    if start_date:
        query = query.where(func.date(TimeEntry.clock_in) >= start_date)
    if end_date:
        query = query.where(func.date(TimeEntry.clock_in) <= end_date)
    
    query = query.order_by(TimeEntry.clock_in.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/time-entries/{entry_id}/approve", response_model=TimeEntryResponse)
async def approve_time_entry(
    entry_id: str,
    data: ApproveTimeEntryRequest,
    db: AsyncSession = Depends(get_db)
):
    """审批打卡记录"""
    entry = await db.get(TimeEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="打卡记录不存在")
    
    entry.is_approved = True
    entry.approved_by = data.approved_by
    entry.approved_at = datetime.utcnow()
    if data.notes:
        entry.notes = (entry.notes or "") + f"\n审批备注: {data.notes}"
    
    await db.commit()
    await db.refresh(entry)
    return entry


# ============ 请假管理 ============

@router.post("/time-off", response_model=TimeOffResponse, status_code=status.HTTP_201_CREATED)
async def create_time_off_request(
    data: TimeOffCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建请假申请"""
    # 计算请假天数
    total_days = (data.end_date - data.start_date).days + 1
    if data.start_time and data.end_time:
        # 半天假
        total_days = 0.5
    
    time_off = TimeOff(
        **data.model_dump(),
        total_days=total_days
    )
    
    db.add(time_off)
    await db.commit()
    await db.refresh(time_off)
    return time_off


@router.get("/time-off", response_model=List[TimeOffResponse])
async def get_time_off_requests(
    restaurant_id: str,
    staff_id: Optional[str] = None,
    status: Optional[TimeOffStatus] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取请假申请列表"""
    query = select(TimeOff).where(TimeOff.restaurant_id == restaurant_id)
    
    if staff_id:
        query = query.where(TimeOff.staff_id == staff_id)
    if status:
        query = query.where(TimeOff.status == status)
    
    query = query.order_by(TimeOff.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/time-off/{time_off_id}/review", response_model=TimeOffResponse)
async def review_time_off_request(
    time_off_id: str,
    data: ReviewTimeOffRequest,
    db: AsyncSession = Depends(get_db)
):
    """审批请假申请"""
    time_off = await db.get(TimeOff, time_off_id)
    if not time_off:
        raise HTTPException(status_code=404, detail="请假申请不存在")
    
    if time_off.status != TimeOffStatus.PENDING:
        raise HTTPException(status_code=400, detail="请假申请已处理")
    
    time_off.status = data.status
    time_off.reviewed_by = data.reviewed_by
    time_off.reviewed_at = datetime.utcnow()
    time_off.review_notes = data.review_notes
    
    await db.commit()
    await db.refresh(time_off)
    return time_off


# ============ 小费管理 ============

@router.post("/tip-pools", response_model=TipPoolResponse, status_code=status.HTTP_201_CREATED)
async def create_tip_pool(
    data: TipPoolCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建小费池"""
    tip_pool = TipPool(**data.model_dump())
    db.add(tip_pool)
    await db.commit()
    await db.refresh(tip_pool)
    return tip_pool


@router.get("/tip-pools", response_model=List[TipPoolResponse])
async def get_tip_pools(
    restaurant_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取小费池列表"""
    query = select(TipPool).where(TipPool.restaurant_id == restaurant_id)
    
    if start_date:
        query = query.where(TipPool.pool_date >= start_date)
    if end_date:
        query = query.where(TipPool.pool_date <= end_date)
    
    query = query.order_by(TipPool.pool_date.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/tip-pools/{pool_id}/distribute", response_model=TipPoolWithDistributions)
async def distribute_tips(
    pool_id: str,
    data: DistributeTipsRequest,
    db: AsyncSession = Depends(get_db)
):
    """分配小费"""
    tip_pool = await db.get(TipPool, pool_id)
    if not tip_pool:
        raise HTTPException(status_code=404, detail="小费池不存在")
    
    if tip_pool.is_distributed:
        raise HTTPException(status_code=400, detail="小费已分配")
    
    # 获取当天的打卡记录
    result = await db.execute(
        select(TimeEntry).where(
            and_(
                TimeEntry.restaurant_id == tip_pool.restaurant_id,
                func.date(TimeEntry.clock_in) == tip_pool.pool_date,
                TimeEntry.clock_out != None
            )
        )
    )
    time_entries = result.scalars().all()
    
    if not time_entries:
        raise HTTPException(status_code=400, detail="当天没有打卡记录")
    
    # 根据分配方式计算
    distributions = []
    
    if data.custom_distributions:
        # 自定义分配
        for dist in data.custom_distributions:
            distribution = TipDistribution(
                tip_pool_id=pool_id,
                staff_id=dist["staff_id"],
                amount=dist["amount"],
                tip_share=dist["amount"] / tip_pool.total_tips if tip_pool.total_tips > 0 else 0
            )
            distributions.append(distribution)
    else:
        # 自动分配
        if tip_pool.distribution_method == TipDistributionMethod.EQUAL:
            # 平均分配
            per_person = tip_pool.total_tips / len(time_entries) if time_entries else 0
            for entry in time_entries:
                distribution = TipDistribution(
                    tip_pool_id=pool_id,
                    staff_id=entry.staff_id,
                    time_entry_id=entry.id,
                    hours_worked=entry.total_minutes / 60,
                    tip_share=1 / len(time_entries),
                    amount=per_person
                )
                distributions.append(distribution)
                
        elif tip_pool.distribution_method == TipDistributionMethod.BY_HOURS:
            # 按工时分配
            total_hours = sum(e.total_minutes for e in time_entries) / 60
            for entry in time_entries:
                hours = entry.total_minutes / 60
                share = hours / total_hours if total_hours > 0 else 0
                distribution = TipDistribution(
                    tip_pool_id=pool_id,
                    staff_id=entry.staff_id,
                    time_entry_id=entry.id,
                    hours_worked=hours,
                    tip_share=share,
                    amount=tip_pool.total_tips * share
                )
                distributions.append(distribution)
    
    # 保存分配记录
    for dist in distributions:
        db.add(dist)
        # 更新员工打卡记录的小费
        if dist.time_entry_id:
            entry = await db.get(TimeEntry, dist.time_entry_id)
            if entry:
                entry.tips_received = dist.amount
    
    tip_pool.is_distributed = True
    tip_pool.distributed_at = datetime.utcnow()
    tip_pool.distributed_by = data.distributed_by
    
    await db.commit()
    
    # 重新加载
    result = await db.execute(
        select(TipPool).options(selectinload(TipPool.distributions)).where(TipPool.id == pool_id)
    )
    return result.scalar_one()


# ============ 工资管理 ============

@router.post("/payroll-periods", response_model=PayrollPeriodResponse, status_code=status.HTTP_201_CREATED)
async def create_payroll_period(
    data: PayrollPeriodCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建工资周期"""
    period = PayrollPeriod(**data.model_dump())
    db.add(period)
    await db.commit()
    await db.refresh(period)
    return period


@router.post("/payroll-periods/{period_id}/process", response_model=PayrollPeriodResponse)
async def process_payroll(
    period_id: str,
    processed_by: str,
    db: AsyncSession = Depends(get_db)
):
    """处理工资（计算所有员工的工资）"""
    period = await db.get(PayrollPeriod, period_id)
    if not period:
        raise HTTPException(status_code=404, detail="工资周期不存在")
    
    if period.status != "open":
        raise HTTPException(status_code=400, detail="工资周期已处理")
    
    # 获取该周期内的所有打卡记录
    result = await db.execute(
        select(TimeEntry).where(
            and_(
                TimeEntry.restaurant_id == period.restaurant_id,
                func.date(TimeEntry.clock_in) >= period.period_start,
                func.date(TimeEntry.clock_in) <= period.period_end,
                TimeEntry.is_approved == True
            )
        )
    )
    time_entries = result.scalars().all()
    
    # 按员工汇总
    staff_data = {}
    for entry in time_entries:
        if entry.staff_id not in staff_data:
            staff_data[entry.staff_id] = {
                "regular_minutes": 0,
                "overtime_minutes": 0,
                "tips": 0.0,
                "hourly_rate": entry.hourly_rate or 0
            }
        staff_data[entry.staff_id]["regular_minutes"] += entry.regular_minutes
        staff_data[entry.staff_id]["overtime_minutes"] += entry.overtime_minutes
        staff_data[entry.staff_id]["tips"] += entry.tips_received
    
    # 创建员工工资单
    total_regular_hours = 0.0
    total_overtime_hours = 0.0
    total_wages = 0.0
    total_tips = 0.0
    
    for staff_id, data in staff_data.items():
        regular_hours = data["regular_minutes"] / 60
        overtime_hours = data["overtime_minutes"] / 60
        hourly_rate = data["hourly_rate"]
        
        regular_pay = regular_hours * hourly_rate
        overtime_pay = overtime_hours * hourly_rate * 1.5
        total_pay = regular_pay + overtime_pay
        
        payroll = StaffPayroll(
            payroll_period_id=period_id,
            staff_id=staff_id,
            regular_hours=regular_hours,
            overtime_hours=overtime_hours,
            hourly_rate=hourly_rate,
            regular_pay=regular_pay,
            overtime_pay=overtime_pay,
            total_wages=total_pay,
            tips=data["tips"],
            gross_pay=total_pay + data["tips"],
            net_pay=total_pay + data["tips"]  # 简化，实际需扣税
        )
        db.add(payroll)
        
        total_regular_hours += regular_hours
        total_overtime_hours += overtime_hours
        total_wages += total_pay
        total_tips += data["tips"]
    
    # 更新周期汇总
    period.status = "closed"
    period.total_regular_hours = total_regular_hours
    period.total_overtime_hours = total_overtime_hours
    period.total_wages = total_wages
    period.total_tips = total_tips
    period.total_payroll = total_wages + total_tips
    period.processed_at = datetime.utcnow()
    period.processed_by = processed_by
    
    await db.commit()
    await db.refresh(period)
    return period


@router.get("/payroll-periods/{period_id}/staff", response_model=List[StaffPayrollResponse])
async def get_staff_payrolls(
    period_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取工资周期内的员工工资单"""
    result = await db.execute(
        select(StaffPayroll).where(StaffPayroll.payroll_period_id == period_id)
    )
    return result.scalars().all()


# ============ 统计报告 ============

@router.get("/labor-cost-summary", response_model=LaborCostSummary)
async def get_labor_cost_summary(
    restaurant_id: str,
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db)
):
    """获取人工成本汇总"""
    result = await db.execute(
        select(TimeEntry).where(
            and_(
                TimeEntry.restaurant_id == restaurant_id,
                func.date(TimeEntry.clock_in) >= start_date,
                func.date(TimeEntry.clock_in) <= end_date
            )
        )
    )
    entries = result.scalars().all()
    
    total_hours = sum(e.total_minutes for e in entries) / 60
    total_wages = sum(e.total_pay for e in entries)
    total_tips = sum(e.tips_received for e in entries)
    
    return LaborCostSummary(
        period_start=start_date,
        period_end=end_date,
        total_hours=total_hours,
        total_wages=total_wages,
        total_tips=total_tips,
        total_labor_cost=total_wages + total_tips,
        labor_cost_percentage=0.0,  # 需要销售数据计算
        average_hourly_cost=total_wages / total_hours if total_hours > 0 else 0,
        by_role={}
    )
