from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class MenuCategory(Base):
    """菜单分类模型"""
    __tablename__ = "menu_categories"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(100), nullable=False)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", back_populates="menu_categories")
    menu_items = relationship("MenuItem", back_populates="category")


class MenuItem(Base):
    """菜品模型"""
    __tablename__ = "menu_items"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    category_id = Column(String(36), ForeignKey("menu_categories.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    cost = Column(Float, nullable=True)  # 成本价
    image_url = Column(String(500), nullable=True)
    is_available = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)  # 推荐菜品
    recipe_id = Column(String(36), nullable=True)  # 机器人菜谱 ID
    robot_recipe_json = Column(JSON, nullable=True)  # 机器人菜谱指令 (JSON)
    prep_time_minutes = Column(Integer, default=10)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", back_populates="menu_items")
    category = relationship("MenuCategory", back_populates="menu_items")
    order_items = relationship("OrderItem", back_populates="menu_item")
    modifier_groups = relationship("ModifierGroup", back_populates="menu_item", cascade="all, delete-orphan")
