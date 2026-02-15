from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import secrets

from app.database import get_db
from app.models.table import Table, TableStatus
from app.schemas.table import TableCreate, TableResponse, TableUpdate

router = APIRouter()


@router.get("/", response_model=List[TableResponse])
async def get_tables(
    restaurant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取餐厅所有桌位"""
    result = await db.execute(
        select(Table)
        .where(Table.restaurant_id == restaurant_id)
        .where(Table.is_active == True)
        .order_by(Table.table_number)
    )
    return result.scalars().all()


@router.get("/{table_id}", response_model=TableResponse)
async def get_table(table_id: str, db: AsyncSession = Depends(get_db)):
    """获取单个桌位"""
    result = await db.execute(select(Table).where(Table.id == table_id))
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(status_code=404, detail="桌位不存在")
    return table


@router.post("/", response_model=TableResponse)
async def create_table(
    table_in: TableCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建桌位"""
    table = Table(**table_in.model_dump())
    db.add(table)
    await db.commit()
    await db.refresh(table)
    return table


@router.put("/{table_id}", response_model=TableResponse)
async def update_table(
    table_id: str,
    table_in: TableUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新桌位信息"""
    result = await db.execute(select(Table).where(Table.id == table_id))
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(status_code=404, detail="桌位不存在")
    
    update_data = table_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(table, key, value)
    
    await db.commit()
    await db.refresh(table)
    return table


@router.patch("/{table_id}/status")
async def update_table_status(
    table_id: str,
    status: TableStatus,
    db: AsyncSession = Depends(get_db)
):
    """更新桌位状态"""
    result = await db.execute(select(Table).where(Table.id == table_id))
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(status_code=404, detail="桌位不存在")
    
    table.status = status
    await db.commit()
    
    return {"id": table_id, "status": status}


@router.delete("/{table_id}")
async def delete_table(table_id: str, db: AsyncSession = Depends(get_db)):
    """删除桌位（软删除）"""
    result = await db.execute(select(Table).where(Table.id == table_id))
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(status_code=404, detail="桌位不存在")
    
    table.is_active = False
    await db.commit()
    return {"message": "删除成功"}


@router.get("/stats/summary")
async def get_table_stats(
    restaurant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取桌位统计摘要"""
    result = await db.execute(
        select(Table)
        .where(Table.restaurant_id == restaurant_id)
        .where(Table.is_active == True)
    )
    tables = result.scalars().all()
    
    stats = {
        "total": len(tables),
        "available": len([t for t in tables if t.status == TableStatus.AVAILABLE]),
        "occupied": len([t for t in tables if t.status == TableStatus.OCCUPIED]),
        "reserved": len([t for t in tables if t.status == TableStatus.RESERVED]),
        "cleaning": len([t for t in tables if t.status == TableStatus.CLEANING]),
    }
    
    return stats


@router.post("/{table_id}/generate-qr")
async def generate_qr_code(
    table_id: str,
    db: AsyncSession = Depends(get_db)
):
    """为桌位生成唯一QR码"""
    result = await db.execute(select(Table).where(Table.id == table_id))
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(status_code=404, detail="桌位不存在")
    
    # 生成唯一QR码标识
    qr_code = f"{table.restaurant_id[:8]}-{table.table_number}-{secrets.token_urlsafe(8)}"
    table.qr_code = qr_code
    table.qr_enabled = True
    
    await db.commit()
    await db.refresh(table)
    
    return {
        "table_id": table_id,
        "qr_code": qr_code,
        "qr_url": f"/qr-order/{qr_code}"
    }


@router.get("/qr/{qr_code}", response_model=TableResponse)
async def get_table_by_qr(
    qr_code: str,
    db: AsyncSession = Depends(get_db)
):
    """通过QR码获取桌位信息"""
    result = await db.execute(
        select(Table)
        .where(Table.qr_code == qr_code)
        .where(Table.qr_enabled == True)
    )
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(status_code=404, detail="无效的QR码或该桌位未启用扫码点餐")
    return table
