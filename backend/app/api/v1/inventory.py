"""
库存管理 API
支持原料管理、BOM配方、库存变动、采购、盘点、86预警
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from app.database import get_db
from app.config import get_settings
from app.models.inventory import (
    Ingredient, Recipe, StockMovement, MovementType,
    Supplier, PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus,
    InventoryCount, InventoryCountItem, StockUnit
)
from app.models.menu import MenuItem
from app.models.order import Order, OrderItem
from app.schemas.inventory import (
    IngredientCreate, IngredientUpdate, IngredientResponse,
    RecipeCreate, RecipeUpdate, RecipeResponse, RecipeWithIngredient,
    StockMovementCreate, StockMovementResponse,
    SupplierCreate, SupplierUpdate, SupplierResponse,
    PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse,
    ReceiveItemRequest,
    InventoryCountCreate, InventoryCountResponse, InventoryCountItemCreate, InventoryCountItemResponse,
    StockAdjustRequest, Mark86Request, LowStockAlert,
    IngredientCostReport, MenuItemCostAnalysis
)

router = APIRouter()
settings = get_settings()


def generate_po_number() -> str:
    """生成采购订单号"""
    now = datetime.now()
    return f"PO-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"


# ============ 原料管理 ============

@router.get("/ingredients", response_model=List[IngredientResponse])
async def get_ingredients(
    restaurant_id: str,
    category: Optional[str] = None,
    low_stock_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """获取原料列表"""
    query = select(Ingredient).where(
        and_(
            Ingredient.restaurant_id == restaurant_id,
            Ingredient.is_active == True
        )
    )
    
    if category:
        query = query.where(Ingredient.category == category)
    
    if low_stock_only:
        query = query.where(Ingredient.current_stock <= Ingredient.low_stock_threshold)
    
    query = query.order_by(Ingredient.name)
    result = await db.execute(query)
    
    ingredients = result.scalars().all()
    
    # 手动计算 available_stock 等属性
    response = []
    for ing in ingredients:
        resp = IngredientResponse(
            **{k: v for k, v in ing.__dict__.items() if not k.startswith('_')},
            available_stock=ing.current_stock - ing.reserved_stock,
            is_low_stock=ing.current_stock <= ing.low_stock_threshold,
            needs_reorder=ing.current_stock <= ing.reorder_point
        )
        response.append(resp)
    
    return response


@router.get("/ingredients/{ingredient_id}", response_model=IngredientResponse)
async def get_ingredient(
    ingredient_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取单个原料详情"""
    ingredient = await db.get(Ingredient, ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="原料不存在")
    
    return IngredientResponse(
        **{k: v for k, v in ingredient.__dict__.items() if not k.startswith('_')},
        available_stock=ingredient.current_stock - ingredient.reserved_stock,
        is_low_stock=ingredient.current_stock <= ingredient.low_stock_threshold,
        needs_reorder=ingredient.current_stock <= ingredient.reorder_point
    )


@router.post("/ingredients", response_model=IngredientResponse, status_code=status.HTTP_201_CREATED)
async def create_ingredient(
    data: IngredientCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建原料"""
    ingredient = Ingredient(**data.model_dump())
    db.add(ingredient)
    await db.commit()
    await db.refresh(ingredient)
    return IngredientResponse(
        **{k: v for k, v in ingredient.__dict__.items() if not k.startswith('_')},
        available_stock=ingredient.current_stock,
        is_low_stock=False,
        needs_reorder=False
    )


@router.put("/ingredients/{ingredient_id}", response_model=IngredientResponse)
async def update_ingredient(
    ingredient_id: str,
    data: IngredientUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新原料"""
    ingredient = await db.get(Ingredient, ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="原料不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ingredient, key, value)
    
    await db.commit()
    await db.refresh(ingredient)
    return ingredient


@router.delete("/ingredients/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ingredient(
    ingredient_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除原料（软删除）"""
    ingredient = await db.get(Ingredient, ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="原料不存在")
    
    ingredient.is_active = False
    await db.commit()


# ============ BOM 配方管理 ============

@router.get("/recipes/{menu_item_id}", response_model=List[RecipeWithIngredient])
async def get_menu_item_recipes(
    menu_item_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取菜品的配方（BOM）"""
    result = await db.execute(
        select(Recipe)
        .options(selectinload(Recipe.ingredient))
        .where(Recipe.menu_item_id == menu_item_id)
    )
    return result.scalars().all()


@router.post("/recipes", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
async def create_recipe(
    data: RecipeCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建配方"""
    # 验证菜品存在
    menu_item = await db.get(MenuItem, data.menu_item_id)
    if not menu_item:
        raise HTTPException(status_code=404, detail="菜品不存在")
    
    # 验证原料存在
    ingredient = await db.get(Ingredient, data.ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="原料不存在")
    
    recipe = Recipe(**data.model_dump())
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)
    return recipe


@router.put("/recipes/{recipe_id}", response_model=RecipeResponse)
async def update_recipe(
    recipe_id: str,
    data: RecipeUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新配方"""
    recipe = await db.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="配方不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(recipe, key, value)
    
    await db.commit()
    await db.refresh(recipe)
    return recipe


@router.delete("/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(
    recipe_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除配方"""
    recipe = await db.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="配方不存在")
    
    await db.delete(recipe)
    await db.commit()


# ============ 库存变动 ============

@router.post("/movements", response_model=StockMovementResponse, status_code=status.HTTP_201_CREATED)
async def create_stock_movement(
    data: StockMovementCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建库存变动记录"""
    ingredient = await db.get(Ingredient, data.ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="原料不存在")
    
    stock_before = ingredient.current_stock
    
    # 更新库存
    if data.quantity > 0:  # 增加
        ingredient.current_stock += data.quantity
    else:  # 减少
        if ingredient.current_stock + data.quantity < 0:
            raise HTTPException(status_code=400, detail="库存不足")
        ingredient.current_stock += data.quantity
    
    stock_after = ingredient.current_stock
    
    # 更新平均成本（如果是采购）
    if data.movement_type == MovementType.PURCHASE and data.unit_cost:
        ingredient.last_cost = data.unit_cost
        # 简化的加权平均成本计算
        if ingredient.average_cost and stock_before > 0:
            total_value = (ingredient.average_cost * stock_before) + (data.unit_cost * data.quantity)
            ingredient.average_cost = total_value / stock_after
        else:
            ingredient.average_cost = data.unit_cost
    
    movement = StockMovement(
        **data.model_dump(),
        stock_before=stock_before,
        stock_after=stock_after,
        total_cost=(data.unit_cost * abs(data.quantity)) if data.unit_cost else None
    )
    
    db.add(movement)
    await db.commit()
    await db.refresh(movement)
    return movement


@router.get("/movements", response_model=List[StockMovementResponse])
async def get_stock_movements(
    restaurant_id: str,
    ingredient_id: Optional[str] = None,
    movement_type: Optional[MovementType] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """获取库存变动记录"""
    query = select(StockMovement).where(StockMovement.restaurant_id == restaurant_id)
    
    if ingredient_id:
        query = query.where(StockMovement.ingredient_id == ingredient_id)
    if movement_type:
        query = query.where(StockMovement.movement_type == movement_type)
    if start_date:
        query = query.where(StockMovement.created_at >= start_date)
    if end_date:
        query = query.where(StockMovement.created_at <= end_date)
    
    query = query.order_by(StockMovement.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


# ============ 库存调整 ============

@router.post("/adjust", response_model=StockMovementResponse)
async def adjust_stock(
    data: StockAdjustRequest,
    db: AsyncSession = Depends(get_db)
):
    """手动调整库存（盘点调整）"""
    ingredient = await db.get(Ingredient, data.ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="原料不存在")
    
    stock_before = ingredient.current_stock
    adjustment = data.new_quantity - stock_before
    
    ingredient.current_stock = data.new_quantity
    
    movement = StockMovement(
        ingredient_id=data.ingredient_id,
        restaurant_id=ingredient.restaurant_id,
        movement_type=MovementType.ADJUSTMENT,
        quantity=adjustment,
        unit=ingredient.unit,
        stock_before=stock_before,
        stock_after=data.new_quantity,
        reason=data.reason,
        staff_id=data.staff_id
    )
    
    db.add(movement)
    await db.commit()
    await db.refresh(movement)
    return movement


# ============ 86 功能 ============

@router.post("/86", status_code=status.HTTP_200_OK)
async def mark_item_86(
    data: Mark86Request,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """86某菜品（标记售罄）"""
    menu_item = await db.get(MenuItem, data.menu_item_id)
    if not menu_item:
        raise HTTPException(status_code=404, detail="菜品不存在")
    
    menu_item.is_available = False
    await db.commit()
    
    # 广播86通知
    try:
        redis = request.app.state.redis
        await redis.publish("inventory:86", f"{data.menu_item_id}:{menu_item.name}")
    except Exception:
        pass
    
    return {"message": f"菜品 {menu_item.name} 已标记为售罄", "menu_item_id": data.menu_item_id}


@router.post("/un86/{menu_item_id}", status_code=status.HTTP_200_OK)
async def unmark_item_86(
    menu_item_id: str,
    db: AsyncSession = Depends(get_db)
):
    """取消86（恢复可用）"""
    menu_item = await db.get(MenuItem, menu_item_id)
    if not menu_item:
        raise HTTPException(status_code=404, detail="菜品不存在")
    
    menu_item.is_available = True
    await db.commit()
    
    return {"message": f"菜品 {menu_item.name} 已恢复可用", "menu_item_id": menu_item_id}


# ============ 低库存预警 ============

@router.get("/alerts/low-stock", response_model=List[LowStockAlert])
async def get_low_stock_alerts(
    restaurant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取低库存预警"""
    result = await db.execute(
        select(Ingredient).where(
            and_(
                Ingredient.restaurant_id == restaurant_id,
                Ingredient.is_active == True,
                Ingredient.is_trackable == True,
                Ingredient.current_stock <= Ingredient.low_stock_threshold
            )
        ).order_by(Ingredient.current_stock)
    )
    
    ingredients = result.scalars().all()
    
    alerts = []
    for ing in ingredients:
        alerts.append(LowStockAlert(
            ingredient_id=ing.id,
            ingredient_name=ing.name,
            current_stock=ing.current_stock,
            low_stock_threshold=ing.low_stock_threshold,
            unit=ing.unit,
            primary_supplier_id=ing.primary_supplier_id,
            suggested_order_quantity=ing.reorder_quantity
        ))
    
    return alerts


# ============ 供应商管理 ============

@router.get("/suppliers", response_model=List[SupplierResponse])
async def get_suppliers(
    restaurant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取供应商列表"""
    result = await db.execute(
        select(Supplier).where(
            and_(
                Supplier.restaurant_id == restaurant_id,
                Supplier.is_active == True
            )
        ).order_by(Supplier.name)
    )
    return result.scalars().all()


@router.post("/suppliers", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    data: SupplierCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建供应商"""
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    return supplier


@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: str,
    data: SupplierUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新供应商"""
    supplier = await db.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="供应商不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(supplier, key, value)
    
    await db.commit()
    await db.refresh(supplier)
    return supplier


# ============ 采购订单 ============

@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
async def get_purchase_orders(
    restaurant_id: str,
    status: Optional[PurchaseOrderStatus] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取采购订单列表"""
    query = select(PurchaseOrder).options(
        selectinload(PurchaseOrder.items)
    ).where(PurchaseOrder.restaurant_id == restaurant_id)
    
    if status:
        query = query.where(PurchaseOrder.status == status)
    
    query = query.order_by(PurchaseOrder.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/purchase-orders", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    data: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建采购订单"""
    # 验证供应商
    supplier = await db.get(Supplier, data.supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="供应商不存在")
    
    # 创建采购订单
    po = PurchaseOrder(
        restaurant_id=data.restaurant_id,
        supplier_id=data.supplier_id,
        order_number=generate_po_number(),
        notes=data.notes,
        expected_date=data.expected_date,
        created_by=data.created_by,
        status=PurchaseOrderStatus.DRAFT
    )
    
    subtotal = 0.0
    for item_data in data.items:
        # 验证原料
        ingredient = await db.get(Ingredient, item_data.ingredient_id)
        if not ingredient:
            raise HTTPException(status_code=404, detail=f"原料不存在: {item_data.ingredient_id}")
        
        total_price = item_data.quantity_ordered * item_data.unit_price
        subtotal += total_price
        
        item = PurchaseOrderItem(
            purchase_order_id=po.id,
            ingredient_id=item_data.ingredient_id,
            quantity_ordered=item_data.quantity_ordered,
            unit=item_data.unit,
            unit_price=item_data.unit_price,
            total_price=total_price,
            notes=item_data.notes
        )
        po.items.append(item)
    
    po.subtotal = subtotal
    po.total = subtotal + po.tax + po.shipping
    
    db.add(po)
    await db.commit()
    
    # 重新加载
    result = await db.execute(
        select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(PurchaseOrder.id == po.id)
    )
    return result.scalar_one()


@router.patch("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    po_id: str,
    data: PurchaseOrderUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新采购订单状态"""
    po = await db.get(PurchaseOrder, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="采购订单不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == PurchaseOrderStatus.ORDERED:
            po.order_date = datetime.utcnow()
    
    for key, value in update_data.items():
        setattr(po, key, value)
    
    await db.commit()
    
    result = await db.execute(
        select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(PurchaseOrder.id == po_id)
    )
    return result.scalar_one()


@router.post("/purchase-orders/{po_id}/receive/{item_id}", response_model=PurchaseOrderResponse)
async def receive_purchase_item(
    po_id: str,
    item_id: str,
    data: ReceiveItemRequest,
    db: AsyncSession = Depends(get_db)
):
    """接收采购项（入库）"""
    po = await db.get(PurchaseOrder, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="采购订单不存在")
    
    item = await db.get(PurchaseOrderItem, item_id)
    if not item or item.purchase_order_id != po_id:
        raise HTTPException(status_code=404, detail="采购项不存在")
    
    # 更新接收数量
    item.quantity_received += data.quantity_received
    
    # 创建库存变动
    ingredient = await db.get(Ingredient, item.ingredient_id)
    stock_before = ingredient.current_stock
    ingredient.current_stock += data.quantity_received
    
    movement = StockMovement(
        ingredient_id=item.ingredient_id,
        restaurant_id=po.restaurant_id,
        movement_type=MovementType.PURCHASE,
        quantity=data.quantity_received,
        unit=item.unit,
        stock_before=stock_before,
        stock_after=ingredient.current_stock,
        unit_cost=item.unit_price,
        total_cost=item.unit_price * data.quantity_received,
        purchase_order_id=po_id,
        notes=data.notes
    )
    db.add(movement)
    
    # 更新采购订单状态
    result = await db.execute(
        select(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == po_id)
    )
    all_items = result.scalars().all()
    
    all_received = all(i.quantity_received >= i.quantity_ordered for i in all_items)
    partial_received = any(i.quantity_received > 0 for i in all_items)
    
    if all_received:
        po.status = PurchaseOrderStatus.RECEIVED
        po.received_date = datetime.utcnow()
    elif partial_received:
        po.status = PurchaseOrderStatus.PARTIAL_RECEIVED
    
    await db.commit()
    
    result = await db.execute(
        select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(PurchaseOrder.id == po_id)
    )
    return result.scalar_one()


# ============ 盘点 ============

@router.post("/counts", response_model=InventoryCountResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory_count(
    data: InventoryCountCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建盘点"""
    count = InventoryCount(
        restaurant_id=data.restaurant_id,
        count_date=datetime.utcnow(),
        count_type=data.count_type,
        counted_by=data.counted_by,
        notes=data.notes
    )
    
    # 获取所有活跃原料
    result = await db.execute(
        select(Ingredient).where(
            and_(
                Ingredient.restaurant_id == data.restaurant_id,
                Ingredient.is_active == True,
                Ingredient.is_trackable == True
            )
        )
    )
    ingredients = result.scalars().all()
    
    count.total_items = len(ingredients)
    
    # 创建盘点项
    for ing in ingredients:
        count_item = InventoryCountItem(
            inventory_count_id=count.id,
            ingredient_id=ing.id,
            system_quantity=ing.current_stock,
            unit_cost=ing.average_cost or ing.cost_per_unit
        )
        count.count_items.append(count_item)
    
    db.add(count)
    await db.commit()
    await db.refresh(count)
    return count


@router.post("/counts/{count_id}/items/{item_id}", response_model=InventoryCountItemResponse)
async def update_count_item(
    count_id: str,
    item_id: str,
    data: InventoryCountItemCreate,
    db: AsyncSession = Depends(get_db)
):
    """更新盘点项"""
    count_item = await db.get(InventoryCountItem, item_id)
    if not count_item or count_item.inventory_count_id != count_id:
        raise HTTPException(status_code=404, detail="盘点项不存在")
    
    count_item.counted_quantity = data.counted_quantity
    count_item.variance = data.counted_quantity - count_item.system_quantity
    count_item.variance_value = count_item.variance * (count_item.unit_cost or 0)
    count_item.is_counted = True
    count_item.notes = data.notes
    
    # 更新盘点汇总
    count = await db.get(InventoryCount, count_id)
    
    result = await db.execute(
        select(InventoryCountItem).where(InventoryCountItem.inventory_count_id == count_id)
    )
    all_items = result.scalars().all()
    
    count.items_counted = sum(1 for i in all_items if i.is_counted)
    count.variance_count = sum(1 for i in all_items if i.is_counted and i.variance != 0)
    count.variance_value = sum(i.variance_value or 0 for i in all_items if i.is_counted)
    
    await db.commit()
    await db.refresh(count_item)
    return count_item


@router.post("/counts/{count_id}/complete", response_model=InventoryCountResponse)
async def complete_inventory_count(
    count_id: str,
    apply_adjustments: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """完成盘点并应用调整"""
    count = await db.get(InventoryCount, count_id)
    if not count:
        raise HTTPException(status_code=404, detail="盘点不存在")
    
    if count.status != "in_progress":
        raise HTTPException(status_code=400, detail="盘点已完成或已取消")
    
    result = await db.execute(
        select(InventoryCountItem).where(InventoryCountItem.inventory_count_id == count_id)
    )
    count_items = result.scalars().all()
    
    if apply_adjustments:
        for item in count_items:
            if item.is_counted and item.variance != 0:
                ingredient = await db.get(Ingredient, item.ingredient_id)
                stock_before = ingredient.current_stock
                ingredient.current_stock = item.counted_quantity
                
                # 创建调整记录
                movement = StockMovement(
                    ingredient_id=item.ingredient_id,
                    restaurant_id=count.restaurant_id,
                    movement_type=MovementType.ADJUSTMENT,
                    quantity=item.variance,
                    unit=ingredient.unit,
                    stock_before=stock_before,
                    stock_after=item.counted_quantity,
                    reason=f"盘点调整 #{count_id[:8]}"
                )
                db.add(movement)
    
    count.status = "completed"
    count.completed_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(count)
    return count


# ============ 成本分析 ============

@router.get("/cost-analysis/{menu_item_id}", response_model=MenuItemCostAnalysis)
async def get_menu_item_cost_analysis(
    menu_item_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取菜品成本分析"""
    menu_item = await db.get(MenuItem, menu_item_id)
    if not menu_item:
        raise HTTPException(status_code=404, detail="菜品不存在")
    
    # 获取配方
    result = await db.execute(
        select(Recipe).options(selectinload(Recipe.ingredient)).where(Recipe.menu_item_id == menu_item_id)
    )
    recipes = result.scalars().all()
    
    # 计算原料成本
    total_ingredient_cost = 0.0
    for recipe in recipes:
        ing = recipe.ingredient
        unit_cost = ing.average_cost or ing.cost_per_unit or 0
        ingredient_cost = recipe.quantity_required * recipe.waste_factor * unit_cost
        total_ingredient_cost += ingredient_cost
    
    selling_price = menu_item.price
    cost_percentage = (total_ingredient_cost / selling_price * 100) if selling_price > 0 else 0
    gross_margin = selling_price - total_ingredient_cost
    
    return MenuItemCostAnalysis(
        menu_item_id=menu_item_id,
        menu_item_name=menu_item.name,
        selling_price=selling_price,
        ingredient_cost=total_ingredient_cost,
        cost_percentage=cost_percentage,
        gross_margin=gross_margin,
        ingredients=recipes
    )
