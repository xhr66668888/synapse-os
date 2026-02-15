"""
预订系统Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.reservation import ReservationStatus, ReservationSource


# ==================== 预订 ====================

class ReservationBase(BaseModel):
    restaurant_id: str
    guest_name: str
    guest_phone: str
    guest_email: Optional[str] = None
    guest_count: int
    reservation_date: datetime
    duration_minutes: int = 90
    preferred_section: Optional[str] = None
    special_requests: Optional[str] = None
    occasion: Optional[str] = None
    has_children: bool = False
    needs_high_chair: bool = False
    dietary_restrictions: Optional[str] = None


class ReservationCreate(ReservationBase):
    source: ReservationSource = ReservationSource.PHONE
    customer_id: Optional[str] = None


class ReservationUpdate(BaseModel):
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    guest_email: Optional[str] = None
    guest_count: Optional[int] = None
    reservation_date: Optional[datetime] = None
    table_id: Optional[str] = None
    special_requests: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[ReservationStatus] = None


class ReservationResponse(ReservationBase):
    id: str
    confirmation_number: str
    status: ReservationStatus
    source: ReservationSource
    table_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    confirmed_at: Optional[datetime] = None
    seated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ==================== 等位队列 ====================

class WaitlistBase(BaseModel):
    restaurant_id: str
    guest_name: str
    guest_phone: str
    party_size: int
    preferred_section: Optional[str] = None
    has_children: bool = False
    needs_high_chair: bool = False
    special_requests: Optional[str] = None


class WaitlistCreate(WaitlistBase):
    pass


class WaitlistResponse(WaitlistBase):
    id: str
    position: int
    status: str
    estimated_wait_minutes: Optional[int]
    table_id: Optional[str] = None
    created_at: datetime
    called_at: Optional[datetime] = None
    seated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
