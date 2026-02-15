from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.menu import MenuCategory, MenuItem
from app.schemas.menu import (
    MenuCategoryCreate, MenuCategoryResponse, MenuCategoryWithItems,
    MenuItemCreate, MenuItemResponse, MenuItemUpdate
)

router = APIRouter()


# ============ 菜单分类 ============

@router.get("/categories", response_model=List[MenuCategoryWithItems])
async def get_categories(
    restaurant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取餐厅所有菜单分类（含菜品）"""
    result = await db.execute(
        select(MenuCategory)
        .where(MenuCategory.restaurant_id == restaurant_id)
        .where(MenuCategory.is_active == True)
        .order_by(MenuCategory.sort_order)
    )
    categories = result.scalars().all()
    
    # 为每个分类加载菜品
    response = []
    for cat in categories:
        items_result = await db.execute(
            select(MenuItem)
            .where(MenuItem.category_id == cat.id)
            .order_by(MenuItem.sort_order)
        )
        items = items_result.scalars().all()
        response.append(MenuCategoryWithItems(
            **{k: v for k, v in cat.__dict__.items() if not k.startswith('_')},
            items=[MenuItemResponse.model_validate(i) for i in items]
        ))
    
    return response


@router.post("/categories", response_model=MenuCategoryResponse)
async def create_category(
    category_in: MenuCategoryCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建菜单分类"""
    category = MenuCategory(**category_in.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


# ============ 菜品 ============

@router.get("/items", response_model=List[MenuItemResponse])
async def get_items(
    restaurant_id: str,
    category_id: str = None,
    available_only: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """获取菜品列表"""
    query = select(MenuItem).where(MenuItem.restaurant_id == restaurant_id)
    
    if category_id:
        query = query.where(MenuItem.category_id == category_id)
    if available_only:
        query = query.where(MenuItem.is_available == True)
    
    query = query.order_by(MenuItem.sort_order)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/items/{item_id}", response_model=MenuItemResponse)
async def get_item(item_id: str, db: AsyncSession = Depends(get_db)):
    """获取单个菜品"""
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="菜品不存在")
    return item


@router.post("/items", response_model=MenuItemResponse)
async def create_item(
    item_in: MenuItemCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建菜品"""
    item = MenuItem(**item_in.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/items/{item_id}", response_model=MenuItemResponse)
async def update_item(
    item_id: str,
    item_in: MenuItemUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新菜品"""
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="菜品不存在")
    
    update_data = item_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/items/{item_id}")
async def delete_item(item_id: str, db: AsyncSession = Depends(get_db)):
    """删除菜品"""
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="菜品不存在")
    
    await db.delete(item)
    await db.commit()
    return {"message": "删除成功"}


@router.patch("/items/{item_id}/availability")
async def toggle_availability(
    item_id: str,
    is_available: bool,
    db: AsyncSession = Depends(get_db)
):
    """切换菜品可用状态（售罄/上架）"""
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="菜品不存在")
    
    item.is_available = is_available
    await db.commit()
    return {"id": item_id, "is_available": is_available}
