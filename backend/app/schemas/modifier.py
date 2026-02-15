"""
修饰符相关的 Pydantic Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ============ ModifierOption Schemas ============

class ModifierOptionBase(BaseModel):
    name: str = Field(..., description="选项名称，如'五分熟'")
    description: Optional[str] = None
    price_adjustment: float = Field(default=0.0, description="价格调整，如 +1.50")
    is_default: bool = Field(default=False, description="是否默认选中")
    is_available: bool = Field(default=True, description="是否可用")
    parent_option_id: Optional[str] = Field(default=None, description="父选项ID，用于嵌套")
    ingredient_id: Optional[str] = Field(default=None, description="关联原料ID")
    sort_order: int = 0


class ModifierOptionCreate(ModifierOptionBase):
    group_id: str


class ModifierOptionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_adjustment: Optional[float] = None
    is_default: Optional[bool] = None
    is_available: Optional[bool] = None
    parent_option_id: Optional[str] = None
    ingredient_id: Optional[str] = None
    sort_order: Optional[int] = None


class ModifierOptionResponse(ModifierOptionBase):
    id: str
    group_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ModifierOptionWithNested(ModifierOptionResponse):
    """包含嵌套子选项的响应"""
    nested_options: List["ModifierOptionWithNested"] = []


# ============ ModifierGroup Schemas ============

class ModifierGroupBase(BaseModel):
    name: str = Field(..., description="修饰符组名称，如'选择温度'")
    description: Optional[str] = None
    min_select: int = Field(default=0, ge=0, description="最少选择数量")
    max_select: int = Field(default=1, ge=1, description="最多选择数量")
    is_required: bool = Field(default=False, description="是否必选")
    sort_order: int = 0
    is_active: bool = True


class ModifierGroupCreate(ModifierGroupBase):
    menu_item_id: str
    options: Optional[List[ModifierOptionBase]] = Field(default=[], description="初始选项列表")


class ModifierGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    min_select: Optional[int] = None
    max_select: Optional[int] = None
    is_required: Optional[bool] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class ModifierGroupResponse(ModifierGroupBase):
    id: str
    menu_item_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ModifierGroupWithOptions(ModifierGroupResponse):
    """包含所有选项的修饰符组响应"""
    options: List[ModifierOptionResponse] = []


# ============ ComboItem Schemas ============

class ComboItemBase(BaseModel):
    group_name: str = Field(..., description="套餐组名称，如'主菜选择'")
    included_item_id: Optional[str] = None
    price_adjustment: float = 0.0
    quantity: int = 1
    is_required: bool = True
    is_default: bool = False
    sort_order: int = 0


class ComboItemCreate(ComboItemBase):
    combo_menu_item_id: str


class ComboItemUpdate(BaseModel):
    group_name: Optional[str] = None
    included_item_id: Optional[str] = None
    price_adjustment: Optional[float] = None
    quantity: Optional[int] = None
    is_required: Optional[bool] = None
    is_default: Optional[bool] = None
    sort_order: Optional[int] = None


class ComboItemResponse(ComboItemBase):
    id: str
    combo_menu_item_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============ MenuSchedule Schemas ============

class MenuScheduleBase(BaseModel):
    schedule_name: str = Field(..., description="时段名称，如'早餐'、'Happy Hour'")
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="开始时间 HH:MM")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="结束时间 HH:MM")
    days_of_week: int = Field(default=127, description="星期位掩码 (127=所有天)")
    special_price: Optional[float] = None
    discount_percent: Optional[float] = None
    is_active: bool = True


class MenuScheduleCreate(MenuScheduleBase):
    menu_item_id: str


class MenuScheduleUpdate(BaseModel):
    schedule_name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    days_of_week: Optional[int] = None
    special_price: Optional[float] = None
    discount_percent: Optional[float] = None
    is_active: Optional[bool] = None


class MenuScheduleResponse(MenuScheduleBase):
    id: str
    menu_item_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ 聚合 Schema ============

class MenuItemWithModifiers(BaseModel):
    """包含完整修饰符信息的菜品响应"""
    id: str
    name: str
    description: Optional[str]
    price: float
    image_url: Optional[str]
    is_available: bool
    modifier_groups: List[ModifierGroupWithOptions] = []
    schedules: List[MenuScheduleResponse] = []

    class Config:
        from_attributes = True


# 解决循环引用
ModifierOptionWithNested.model_rebuild()
