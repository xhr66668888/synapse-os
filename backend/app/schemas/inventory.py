"""
库存管理 Pydantic Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from app.models.inventory import StockUnit, MovementType, PurchaseOrderStatus


# ============ Ingredient Schemas ============

class IngredientBase(BaseModel):
    name: str
    sku: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: StockUnit
    low_stock_threshold: float = 10.0
    reorder_point: float = 20.0
    reorder_quantity: float = 50.0
    cost_per_unit: float = 0.0
    storage_location: Optional[str] = None
    storage_temp: Optional[str] = None
    shelf_life_days: Optional[int] = None
    is_trackable: bool = True


class IngredientCreate(IngredientBase):
    restaurant_id: str
    primary_supplier_id: Optional[str] = None
    current_stock: float = 0.0


class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[StockUnit] = None
    low_stock_threshold: Optional[float] = None
    reorder_point: Optional[float] = None
    reorder_quantity: Optional[float] = None
    cost_per_unit: Optional[float] = None
    primary_supplier_id: Optional[str] = None
    storage_location: Optional[str] = None
    is_active: Optional[bool] = None


class IngredientResponse(IngredientBase):
    id: str
    restaurant_id: str
    current_stock: float
    reserved_stock: float = 0.0
    available_stock: float = 0.0
    is_low_stock: bool = False
    needs_reorder: bool = False
    last_cost: Optional[float] = None
    average_cost: Optional[float] = None
    primary_supplier_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Recipe (BOM) Schemas ============

class RecipeBase(BaseModel):
    ingredient_id: str
    quantity_required: float = Field(..., gt=0)
    unit: StockUnit
    is_variable: bool = False
    waste_factor: float = 1.0
    notes: Optional[str] = None


class RecipeCreate(RecipeBase):
    menu_item_id: str


class RecipeUpdate(BaseModel):
    quantity_required: Optional[float] = None
    unit: Optional[StockUnit] = None
    is_variable: Optional[bool] = None
    waste_factor: Optional[float] = None
    notes: Optional[str] = None


class RecipeResponse(RecipeBase):
    id: str
    menu_item_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class RecipeWithIngredient(RecipeResponse):
    """包含原料信息的配方响应"""
    ingredient: IngredientResponse


# ============ Stock Movement Schemas ============

class StockMovementCreate(BaseModel):
    ingredient_id: str
    restaurant_id: str
    movement_type: MovementType
    quantity: float = Field(..., description="正数增加，负数减少")
    unit: StockUnit
    unit_cost: Optional[float] = None
    order_id: Optional[str] = None
    purchase_order_id: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    staff_id: Optional[str] = None


class StockMovementResponse(BaseModel):
    id: str
    ingredient_id: str
    restaurant_id: str
    movement_type: MovementType
    quantity: float
    unit: StockUnit
    stock_before: float
    stock_after: float
    unit_cost: Optional[float] = None
    total_cost: Optional[float] = None
    order_id: Optional[str] = None
    purchase_order_id: Optional[str] = None
    reason: Optional[str] = None
    staff_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Supplier Schemas ============

class SupplierBase(BaseModel):
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    payment_terms: Optional[str] = None
    lead_time_days: int = 1
    minimum_order: Optional[float] = None


class SupplierCreate(SupplierBase):
    restaurant_id: str


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    payment_terms: Optional[str] = None
    lead_time_days: Optional[int] = None
    minimum_order: Optional[float] = None
    rating: Optional[float] = None
    is_active: Optional[bool] = None


class SupplierResponse(SupplierBase):
    id: str
    restaurant_id: str
    rating: Optional[float] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Purchase Order Schemas ============

class PurchaseOrderItemBase(BaseModel):
    ingredient_id: str
    quantity_ordered: float = Field(..., gt=0)
    unit: StockUnit
    unit_price: float = Field(..., ge=0)
    notes: Optional[str] = None


class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass


class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: str
    purchase_order_id: str
    quantity_received: float = 0.0
    total_price: float

    class Config:
        from_attributes = True


class PurchaseOrderBase(BaseModel):
    supplier_id: str
    notes: Optional[str] = None
    expected_date: Optional[datetime] = None


class PurchaseOrderCreate(PurchaseOrderBase):
    restaurant_id: str
    items: List[PurchaseOrderItemCreate]
    created_by: Optional[str] = None


class PurchaseOrderUpdate(BaseModel):
    status: Optional[PurchaseOrderStatus] = None
    notes: Optional[str] = None
    expected_date: Optional[datetime] = None


class PurchaseOrderResponse(PurchaseOrderBase):
    id: str
    restaurant_id: str
    order_number: str
    status: PurchaseOrderStatus
    subtotal: float
    tax: float
    shipping: float
    total: float
    order_date: Optional[datetime] = None
    received_date: Optional[datetime] = None
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[PurchaseOrderItemResponse] = []

    class Config:
        from_attributes = True


class ReceiveItemRequest(BaseModel):
    """接收采购项请求"""
    quantity_received: float = Field(..., gt=0)
    notes: Optional[str] = None


# ============ Inventory Count Schemas ============

class InventoryCountItemCreate(BaseModel):
    ingredient_id: str
    counted_quantity: float
    notes: Optional[str] = None


class InventoryCountItemResponse(BaseModel):
    id: str
    ingredient_id: str
    system_quantity: float
    counted_quantity: Optional[float] = None
    variance: Optional[float] = None
    unit_cost: Optional[float] = None
    variance_value: Optional[float] = None
    is_counted: bool = False
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class InventoryCountCreate(BaseModel):
    restaurant_id: str
    count_type: str = "full"  # full, partial, cycle
    counted_by: Optional[str] = None
    notes: Optional[str] = None


class InventoryCountResponse(BaseModel):
    id: str
    restaurant_id: str
    count_date: datetime
    status: str
    count_type: str
    total_items: int
    items_counted: int
    variance_count: int
    variance_value: float
    counted_by: Optional[str] = None
    approved_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ 特殊操作 Schemas ============

class StockAdjustRequest(BaseModel):
    """库存调整请求"""
    ingredient_id: str
    new_quantity: float = Field(..., ge=0)
    reason: str
    staff_id: Optional[str] = None


class Mark86Request(BaseModel):
    """86某菜品请求"""
    menu_item_id: str
    reason: Optional[str] = None


class LowStockAlert(BaseModel):
    """低库存预警"""
    ingredient_id: str
    ingredient_name: str
    current_stock: float
    low_stock_threshold: float
    unit: StockUnit
    primary_supplier_id: Optional[str] = None
    suggested_order_quantity: float


class IngredientCostReport(BaseModel):
    """原料成本报告"""
    ingredient_id: str
    ingredient_name: str
    total_consumed: float
    unit: StockUnit
    average_cost: float
    total_cost: float
    period_start: datetime
    period_end: datetime


class MenuItemCostAnalysis(BaseModel):
    """菜品成本分析"""
    menu_item_id: str
    menu_item_name: str
    selling_price: float
    ingredient_cost: float
    cost_percentage: float
    gross_margin: float
    ingredients: List[RecipeWithIngredient]
