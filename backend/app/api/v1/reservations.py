"""
预订系统API
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import List, Optional
from datetime import datetime, timedelta
import secrets

from app.database import get_db
from app.models.reservation import Reservation, ReservationStatus, ReservationSource, WaitlistEntry
from app.schemas.reservation import (
    ReservationCreate, ReservationResponse, ReservationUpdate,
    WaitlistCreate, WaitlistResponse
)

router = APIRouter()


@router.post("/", response_model=ReservationResponse)
async def create_reservation(
    reservation_in: ReservationCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建预订"""
    # 生成确认号
    confirmation_number = f"RES{secrets.token_hex(4).upper()}"
    
    reservation = Reservation(
        **reservation_in.model_dump(),
        confirmation_number=confirmation_number
    )
    db.add(reservation)
    await db.commit()
    await db.refresh(reservation)
    return reservation


@router.get("/", response_model=List[ReservationResponse])
async def get_reservations(
    restaurant_id: str,
    date: Optional[str] = None,
    status: Optional[ReservationStatus] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取预订列表"""
    query = select(Reservation).where(Reservation.restaurant_id == restaurant_id)
    
    if date:
        # 获取指定日期的预订
        target_date = datetime.fromisoformat(date)
        start_of_day = target_date.replace(hour=0, minute=0, second=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59)
        query = query.where(
            and_(
                Reservation.reservation_date >= start_of_day,
                Reservation.reservation_date <= end_of_day
            )
        )
    
    if status:
        query = query.where(Reservation.status == status)
    
    query = query.order_by(Reservation.reservation_date)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{reservation_id}", response_model=ReservationResponse)
async def get_reservation(
    reservation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取预订详情"""
    result = await db.execute(
        select(Reservation).where(Reservation.id == reservation_id)
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="预订不存在")
    return reservation


@router.get("/confirmation/{confirmation_number}", response_model=ReservationResponse)
async def get_reservation_by_confirmation(
    confirmation_number: str,
    db: AsyncSession = Depends(get_db)
):
    """通过确认号查询预订"""
    result = await db.execute(
        select(Reservation).where(Reservation.confirmation_number == confirmation_number)
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="预订不存在")
    return reservation


@router.put("/{reservation_id}", response_model=ReservationResponse)
async def update_reservation(
    reservation_id: str,
    reservation_in: ReservationUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新预订"""
    result = await db.execute(
        select(Reservation).where(Reservation.id == reservation_id)
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="预订不存在")
    
    update_data = reservation_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(reservation, key, value)
    
    await db.commit()
    await db.refresh(reservation)
    return reservation


@router.patch("/{reservation_id}/status")
async def update_reservation_status(
    reservation_id: str,
    status: ReservationStatus,
    db: AsyncSession = Depends(get_db)
):
    """更新预订状态"""
    result = await db.execute(
        select(Reservation).where(Reservation.id == reservation_id)
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="预订不存在")
    
    reservation.status = status
    
    # 更新时间戳
    now = datetime.utcnow()
    if status == ReservationStatus.CONFIRMED:
        reservation.confirmed_at = now
    elif status == ReservationStatus.SEATED:
        reservation.seated_at = now
    elif status == ReservationStatus.COMPLETED:
        reservation.completed_at = now
    elif status == ReservationStatus.CANCELLED:
        reservation.cancelled_at = now
    
    await db.commit()
    return {"id": reservation_id, "status": status}


@router.post("/{reservation_id}/assign-table")
async def assign_table(
    reservation_id: str,
    table_id: str,
    db: AsyncSession = Depends(get_db)
):
    """为预订分配桌位"""
    result = await db.execute(
        select(Reservation).where(Reservation.id == reservation_id)
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="预订不存在")
    
    reservation.table_id = table_id
    await db.commit()
    
    return {"reservation_id": reservation_id, "table_id": table_id}


@router.get("/availability/check")
async def check_availability(
    restaurant_id: str,
    date: str,
    time: str,
    party_size: int,
    db: AsyncSession = Depends(get_db)
):
    """检查可用性"""
    # 解析日期时间
    reservation_datetime = datetime.fromisoformat(f"{date}T{time}")
    
    # 获取该时段的现有预订
    start_time = reservation_datetime - timedelta(minutes=30)
    end_time = reservation_datetime + timedelta(minutes=120)
    
    result = await db.execute(
        select(Reservation).where(
            and_(
                Reservation.restaurant_id == restaurant_id,
                Reservation.reservation_date >= start_time,
                Reservation.reservation_date <= end_time,
                Reservation.status.in_([
                    ReservationStatus.CONFIRMED,
                    ReservationStatus.SEATED
                ])
            )
        )
    )
    existing_reservations = result.scalars().all()
    
    # 简化逻辑：假设餐厅有20桌，最多接受15个预订
    max_capacity = 15
    current_reservations = len(existing_reservations)
    available = current_reservations < max_capacity
    
    return {
        "available": available,
        "current_reservations": current_reservations,
        "suggested_times": [
            (reservation_datetime + timedelta(minutes=30)).strftime("%H:%M"),
            (reservation_datetime + timedelta(minutes=60)).strftime("%H:%M"),
        ] if not available else []
    }


# ==================== 等位队列 ====================

@router.post("/waitlist/", response_model=WaitlistResponse)
async def add_to_waitlist(
    entry_in: WaitlistCreate,
    db: AsyncSession = Depends(get_db)
):
    """加入等位队列"""
    # 获取当前队列长度
    result = await db.execute(
        select(func.count(WaitlistEntry.id)).where(
            and_(
                WaitlistEntry.restaurant_id == entry_in.restaurant_id,
                WaitlistEntry.status == 'waiting'
            )
        )
    )
    current_count = result.scalar()
    
    entry = WaitlistEntry(
        **entry_in.model_dump(),
        position=current_count + 1,
        estimated_wait_minutes=(current_count + 1) * 15  # 简化：每组预计15分钟
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/waitlist/", response_model=List[WaitlistResponse])
async def get_waitlist(
    restaurant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取等位队列"""
    result = await db.execute(
        select(WaitlistEntry).where(
            and_(
                WaitlistEntry.restaurant_id == restaurant_id,
                WaitlistEntry.status == 'waiting'
            )
        ).order_by(WaitlistEntry.position)
    )
    return result.scalars().all()


@router.patch("/waitlist/{entry_id}/call")
async def call_waitlist_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db)
):
    """叫号"""
    result = await db.execute(
        select(WaitlistEntry).where(WaitlistEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="等位记录不存在")
    
    entry.status = 'called'
    entry.called_at = datetime.utcnow()
    await db.commit()
    
    return {"id": entry_id, "status": "called"}


@router.patch("/waitlist/{entry_id}/seat")
async def seat_waitlist_entry(
    entry_id: str,
    table_id: str,
    db: AsyncSession = Depends(get_db)
):
    """入座"""
    result = await db.execute(
        select(WaitlistEntry).where(WaitlistEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="等位记录不存在")
    
    entry.status = 'seated'
    entry.table_id = table_id
    entry.seated_at = datetime.utcnow()
    await db.commit()
    
    return {"id": entry_id, "status": "seated", "table_id": table_id}


@router.delete("/waitlist/{entry_id}")
async def cancel_waitlist_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db)
):
    """取消等位"""
    result = await db.execute(
        select(WaitlistEntry).where(WaitlistEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="等位记录不存在")
    
    entry.status = 'cancelled'
    entry.cancelled_at = datetime.utcnow()
    await db.commit()
    
    return {"message": "已取消等位"}
