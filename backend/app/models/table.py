from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.database import Base


class TableStatus(str, enum.Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"
    CLEANING = "cleaning"


class Table(Base):
    """桌位模型"""
    __tablename__ = "tables"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    table_number = Column(String(10), nullable=False)
    capacity = Column(Integer, default=4)
    status = Column(Enum(TableStatus), default=TableStatus.AVAILABLE)
    section = Column(String(50), nullable=True)  # 区域，如 "A区"、"室外"
    position_x = Column(Integer, default=0)  # 平面图位置
    position_y = Column(Integer, default=0)
    qr_code = Column(String(100), nullable=True)  # QR码唯一标识
    qr_enabled = Column(Boolean, default=True)  # 是否启用QR码点餐
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", back_populates="tables")
