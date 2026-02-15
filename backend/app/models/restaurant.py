from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.database import Base


class LicenseType(str, enum.Enum):
    LITE = "LITE"
    STANDARD = "STANDARD"
    GOLD = "GOLD"


class Restaurant(Base):
    """餐厅/门店模型"""
    __tablename__ = "restaurants"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    address = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    license_type = Column(Enum(LicenseType), default=LicenseType.STANDARD)
    robot_enabled = Column(Boolean, default=False)
    
    # 多店管理支持
    organization_id = Column(String(36), nullable=True)  # 所属组织ID
    location_code = Column(String(20), nullable=True)  # 门店编号
    is_flagship = Column(Boolean, default=False)  # 是否旗舰店
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    users = relationship("User", back_populates="restaurant")
    menu_categories = relationship("MenuCategory", back_populates="restaurant")
    menu_items = relationship("MenuItem", back_populates="restaurant")
    orders = relationship("Order", back_populates="restaurant")
    tables = relationship("Table", back_populates="restaurant")
    staff = relationship("Staff", back_populates="restaurant")
