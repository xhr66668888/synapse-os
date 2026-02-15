from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


class MenuCategoryBase(BaseModel):
    name: str
    sort_order: int = 0
    is_active: bool = True


class MenuCategoryCreate(MenuCategoryBase):
    restaurant_id: str


class MenuCategoryResponse(MenuCategoryBase):
    id: str
    restaurant_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class MenuItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    cost: Optional[float] = None
    image_url: Optional[str] = None
    is_available: bool = True
    is_featured: bool = False
    robot_recipe_json: Optional[Dict | List] = None
    prep_time_minutes: int = 10
    sort_order: int = 0


class MenuItemCreate(MenuItemBase):
    restaurant_id: str
    category_id: str


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    cost: Optional[float] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None
    is_featured: Optional[bool] = None
    robot_recipe_json: Optional[Dict | List] = None
    prep_time_minutes: Optional[int] = None
    sort_order: Optional[int] = None


class MenuItemResponse(MenuItemBase):
    id: str
    restaurant_id: str
    category_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MenuCategoryWithItems(MenuCategoryResponse):
    items: List[MenuItemResponse] = []
