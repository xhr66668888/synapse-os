from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models.staff import Staff, StaffRole

router = APIRouter()


# Schemas
class StaffBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: StaffRole = StaffRole.SERVER
    hourly_rate: float = 15.0
    avatar_url: Optional[str] = None


class StaffCreate(StaffBase):
    restaurant_id: str


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[StaffRole] = None
    hourly_rate: Optional[float] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None


class StaffResponse(StaffBase):
    id: str
    restaurant_id: str
    is_active: bool
    hire_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# Routes

@router.get("/", response_model=List[StaffResponse])
async def get_staff_list(
    restaurant_id: str,
    role: StaffRole = None,
    db: AsyncSession = Depends(get_db)
):
    """获取员工列表"""
    query = select(Staff).where(Staff.restaurant_id == restaurant_id).where(Staff.is_active == True)
    
    if role:
        query = query.where(Staff.role == role)
    
    query = query.order_by(Staff.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{staff_id}", response_model=StaffResponse)
async def get_staff(staff_id: str, db: AsyncSession = Depends(get_db)):
    """获取单个员工"""
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="员工不存在")
    return staff


@router.post("/", response_model=StaffResponse)
async def create_staff(
    staff_in: StaffCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建员工"""
    staff = Staff(**staff_in.model_dump())
    db.add(staff)
    await db.commit()
    await db.refresh(staff)
    return staff


@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: str,
    staff_in: StaffUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新员工信息"""
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="员工不存在")
    
    update_data = staff_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(staff, key, value)
    
    await db.commit()
    await db.refresh(staff)
    return staff


@router.delete("/{staff_id}")
async def delete_staff(staff_id: str, db: AsyncSession = Depends(get_db)):
    """删除员工（软删除）"""
    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="员工不存在")
    
    staff.is_active = False
    await db.commit()
    return {"message": "删除成功"}


@router.get("/stats/by-role")
async def get_staff_stats(
    restaurant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """按角色统计员工"""
    result = await db.execute(
        select(Staff)
        .where(Staff.restaurant_id == restaurant_id)
        .where(Staff.is_active == True)
    )
    staff_list = result.scalars().all()
    
    stats = {}
    for role in StaffRole:
        stats[role.value] = len([s for s in staff_list if s.role == role])
    
    stats["total"] = len(staff_list)
    return stats
