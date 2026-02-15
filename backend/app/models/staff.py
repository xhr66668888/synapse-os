from sqlalchemy import Column, String, Boolean, DateTime, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.database import Base


class StaffRole(str, enum.Enum):
    MANAGER = "manager"
    SERVER = "server"
    CHEF = "chef"
    CASHIER = "cashier"
    HOST = "host"


class Staff(Base):
    """员工模型"""
    __tablename__ = "staff"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    role = Column(Enum(StaffRole), default=StaffRole.SERVER)
    hourly_rate = Column(Float, default=15.0)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    hire_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", back_populates="staff")
