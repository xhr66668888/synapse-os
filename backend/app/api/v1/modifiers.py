"""
修饰符管理 API
支持嵌套修饰符组、套餐组合、时段菜单
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.database import get_db
from app.models.modifier import ModifierGroup, ModifierOption, ComboItem, MenuSchedule
from app.models.menu import MenuItem
from app.schemas.modifier import (
    ModifierGroupCreate, ModifierGroupUpdate, ModifierGroupResponse, ModifierGroupWithOptions,
    ModifierOptionCreate, ModifierOptionUpdate, ModifierOptionResponse,
    ComboItemCreate, ComboItemUpdate, ComboItemResponse,
    MenuScheduleCreate, MenuScheduleUpdate, MenuScheduleResponse,
    MenuItemWithModifiers
)

router = APIRouter()


# ============ ModifierGroup 端点 ============

@router.get("/groups", response_model=List[ModifierGroupWithOptions])
async def get_modifier_groups(
    menu_item_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取修饰符组列表，可按菜品筛选"""
    query = select(ModifierGroup).options(selectinload(ModifierGroup.options))
    
    if menu_item_id:
        query = query.where(ModifierGroup.menu_item_id == menu_item_id)
    
    query = query.order_by(ModifierGroup.sort_order)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/groups/{group_id}", response_model=ModifierGroupWithOptions)
async def get_modifier_group(
    group_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取单个修饰符组详情"""
    query = select(ModifierGroup).options(
        selectinload(ModifierGroup.options)
    ).where(ModifierGroup.id == group_id)
    
    result = await db.execute(query)
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="修饰符组不存在")
    
    return group


@router.post("/groups", response_model=ModifierGroupWithOptions, status_code=status.HTTP_201_CREATED)
async def create_modifier_group(
    data: ModifierGroupCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建修饰符组（可同时创建选项）"""
    # 验证菜品存在
    menu_item = await db.get(MenuItem, data.menu_item_id)
    if not menu_item:
        raise HTTPException(status_code=404, detail="菜品不存在")
    
    # 创建修饰符组
    group = ModifierGroup(
        menu_item_id=data.menu_item_id,
        name=data.name,
        description=data.description,
        min_select=data.min_select,
        max_select=data.max_select,
        is_required=data.is_required,
        sort_order=data.sort_order,
        is_active=data.is_active
    )
    db.add(group)
    await db.flush()  # 获取 group.id
    
    # 创建初始选项
    if data.options:
        for i, opt_data in enumerate(data.options):
            option = ModifierOption(
                group_id=group.id,
                name=opt_data.name,
                description=opt_data.description,
                price_adjustment=opt_data.price_adjustment,
                is_default=opt_data.is_default,
                is_available=opt_data.is_available,
                parent_option_id=opt_data.parent_option_id,
                ingredient_id=opt_data.ingredient_id,
                sort_order=opt_data.sort_order if opt_data.sort_order else i
            )
            db.add(option)
    
    await db.commit()
    
    # 重新加载带选项的组
    query = select(ModifierGroup).options(
        selectinload(ModifierGroup.options)
    ).where(ModifierGroup.id == group.id)
    result = await db.execute(query)
    return result.scalar_one()


@router.put("/groups/{group_id}", response_model=ModifierGroupResponse)
async def update_modifier_group(
    group_id: str,
    data: ModifierGroupUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新修饰符组"""
    group = await db.get(ModifierGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="修饰符组不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(group, key, value)
    
    await db.commit()
    await db.refresh(group)
    return group


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_modifier_group(
    group_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除修饰符组（级联删除所有选项）"""
    group = await db.get(ModifierGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="修饰符组不存在")
    
    await db.delete(group)
    await db.commit()


# ============ ModifierOption 端点 ============

@router.get("/options", response_model=List[ModifierOptionResponse])
async def get_modifier_options(
    group_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取指定组的所有选项"""
    query = select(ModifierOption).where(
        ModifierOption.group_id == group_id
    ).order_by(ModifierOption.sort_order)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/options", response_model=ModifierOptionResponse, status_code=status.HTTP_201_CREATED)
async def create_modifier_option(
    data: ModifierOptionCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建修饰符选项"""
    # 验证组存在
    group = await db.get(ModifierGroup, data.group_id)
    if not group:
        raise HTTPException(status_code=404, detail="修饰符组不存在")
    
    # 验证父选项存在（如果指定）
    if data.parent_option_id:
        parent = await db.get(ModifierOption, data.parent_option_id)
        if not parent:
            raise HTTPException(status_code=404, detail="父选项不存在")
    
    option = ModifierOption(**data.model_dump())
    db.add(option)
    await db.commit()
    await db.refresh(option)
    return option


@router.put("/options/{option_id}", response_model=ModifierOptionResponse)
async def update_modifier_option(
    option_id: str,
    data: ModifierOptionUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新修饰符选项"""
    option = await db.get(ModifierOption, option_id)
    if not option:
        raise HTTPException(status_code=404, detail="选项不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(option, key, value)
    
    await db.commit()
    await db.refresh(option)
    return option


@router.delete("/options/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_modifier_option(
    option_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除修饰符选项"""
    option = await db.get(ModifierOption, option_id)
    if not option:
        raise HTTPException(status_code=404, detail="选项不存在")
    
    await db.delete(option)
    await db.commit()


@router.patch("/options/{option_id}/availability", response_model=ModifierOptionResponse)
async def toggle_option_availability(
    option_id: str,
    db: AsyncSession = Depends(get_db)
):
    """切换选项可用状态（86功能）"""
    option = await db.get(ModifierOption, option_id)
    if not option:
        raise HTTPException(status_code=404, detail="选项不存在")
    
    option.is_available = not option.is_available
    await db.commit()
    await db.refresh(option)
    return option


# ============ ComboItem 端点 ============

@router.get("/combos", response_model=List[ComboItemResponse])
async def get_combo_items(
    combo_menu_item_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取套餐的所有组件"""
    query = select(ComboItem).where(
        ComboItem.combo_menu_item_id == combo_menu_item_id
    ).order_by(ComboItem.sort_order)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/combos", response_model=ComboItemResponse, status_code=status.HTTP_201_CREATED)
async def create_combo_item(
    data: ComboItemCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建套餐组件"""
    # 验证套餐菜品存在
    combo_item = await db.get(MenuItem, data.combo_menu_item_id)
    if not combo_item:
        raise HTTPException(status_code=404, detail="套餐菜品不存在")
    
    # 验证包含的菜品存在（如果指定）
    if data.included_item_id:
        included = await db.get(MenuItem, data.included_item_id)
        if not included:
            raise HTTPException(status_code=404, detail="包含的菜品不存在")
    
    combo = ComboItem(**data.model_dump())
    db.add(combo)
    await db.commit()
    await db.refresh(combo)
    return combo


@router.put("/combos/{combo_id}", response_model=ComboItemResponse)
async def update_combo_item(
    combo_id: str,
    data: ComboItemUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新套餐组件"""
    combo = await db.get(ComboItem, combo_id)
    if not combo:
        raise HTTPException(status_code=404, detail="套餐组件不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(combo, key, value)
    
    await db.commit()
    await db.refresh(combo)
    return combo


@router.delete("/combos/{combo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_combo_item(
    combo_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除套餐组件"""
    combo = await db.get(ComboItem, combo_id)
    if not combo:
        raise HTTPException(status_code=404, detail="套餐组件不存在")
    
    await db.delete(combo)
    await db.commit()


# ============ MenuSchedule 端点 ============

@router.get("/schedules", response_model=List[MenuScheduleResponse])
async def get_menu_schedules(
    menu_item_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取时段菜单配置"""
    query = select(MenuSchedule)
    
    if menu_item_id:
        query = query.where(MenuSchedule.menu_item_id == menu_item_id)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/schedules", response_model=MenuScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_menu_schedule(
    data: MenuScheduleCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建时段菜单配置"""
    # 验证菜品存在
    menu_item = await db.get(MenuItem, data.menu_item_id)
    if not menu_item:
        raise HTTPException(status_code=404, detail="菜品不存在")
    
    schedule = MenuSchedule(**data.model_dump())
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return schedule


@router.put("/schedules/{schedule_id}", response_model=MenuScheduleResponse)
async def update_menu_schedule(
    schedule_id: str,
    data: MenuScheduleUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新时段菜单配置"""
    schedule = await db.get(MenuSchedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="时段配置不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(schedule, key, value)
    
    await db.commit()
    await db.refresh(schedule)
    return schedule


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu_schedule(
    schedule_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除时段菜单配置"""
    schedule = await db.get(MenuSchedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="时段配置不存在")
    
    await db.delete(schedule)
    await db.commit()


# ============ 聚合端点 ============

@router.get("/menu-items/{item_id}/full", response_model=MenuItemWithModifiers)
async def get_menu_item_with_modifiers(
    item_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取菜品的完整修饰符信息（包括修饰符组、选项、时段配置）"""
    query = select(MenuItem).options(
        selectinload(MenuItem.modifier_groups).selectinload(ModifierGroup.options),
        selectinload(MenuItem.schedules)
    ).where(MenuItem.id == item_id)
    
    result = await db.execute(query)
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="菜品不存在")
    
    return item
