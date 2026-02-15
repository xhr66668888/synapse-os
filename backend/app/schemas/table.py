from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.table import TableStatus


class TableBase(BaseModel):
    table_number: str
    capacity: int = 4
    status: TableStatus = TableStatus.AVAILABLE
    section: Optional[str] = None
    position_x: int = 0
    position_y: int = 0
    is_active: bool = True


class TableCreate(TableBase):
    restaurant_id: str


class TableUpdate(BaseModel):
    table_number: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[TableStatus] = None
    section: Optional[str] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    is_active: Optional[bool] = None


class TableResponse(TableBase):
    id: str
    restaurant_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
