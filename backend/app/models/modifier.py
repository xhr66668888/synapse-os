"""
菜单修饰符模型 - 支持嵌套修饰符组（如Toast/Chowbus标准）
"""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class ModifierGroup(Base):
    """
    修饰符组模型
    例如: "选择温度", "选择配料", "选择尺寸"
    """
    __tablename__ = "modifier_groups"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    menu_item_id = Column(String(36), ForeignKey("menu_items.id"), nullable=False)
    name = Column(String(100), nullable=False)  # 如 "选择温度"
    description = Column(Text, nullable=True)
    
    # 选择规则
    min_select = Column(Integer, default=0)  # 最少选择数量（0表示可选）
    max_select = Column(Integer, default=1)  # 最多选择数量（1表示单选）
    is_required = Column(Boolean, default=False)  # 是否必选
    
    # 显示设置
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    menu_item = relationship("MenuItem", back_populates="modifier_groups")
    options = relationship("ModifierOption", back_populates="group", cascade="all, delete-orphan",
                          foreign_keys="ModifierOption.group_id")


class ModifierOption(Base):
    """
    修饰符选项模型
    例如: "五分熟", "七分熟", "加芝士 +$1.50"
    支持嵌套：如 "披萨配料" -> "左半边/右半边/全部"
    """
    __tablename__ = "modifier_options"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String(36), ForeignKey("modifier_groups.id"), nullable=False)
    
    # 基础信息
    name = Column(String(100), nullable=False)  # 如 "五分熟"
    description = Column(Text, nullable=True)
    
    # 价格调整
    price_adjustment = Column(Float, default=0.0)  # 加价金额（如 +$1.50）
    
    # 选项设置
    is_default = Column(Boolean, default=False)  # 是否默认选中
    is_available = Column(Boolean, default=True)  # 是否可用（用于86某选项）
    
    # 嵌套支持 - 指向父选项（用于如 "披萨配料->左半边"）
    parent_option_id = Column(String(36), ForeignKey("modifier_options.id"), nullable=True)
    
    # 库存关联（可选，用于扣减库存）
    ingredient_id = Column(String(36), nullable=True)  # 关联原料ID
    
    # 显示设置
    sort_order = Column(Integer, default=0)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    group = relationship("ModifierGroup", back_populates="options", foreign_keys=[group_id])
    parent_option = relationship("ModifierOption", remote_side=[id], backref="nested_options")


class ComboItem(Base):
    """
    套餐组合模型
    用于定义套餐中包含的菜品及其规则
    """
    __tablename__ = "combo_items"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    combo_menu_item_id = Column(String(36), ForeignKey("menu_items.id"), nullable=False)  # 套餐菜品ID
    
    # 套餐组信息
    group_name = Column(String(100), nullable=False)  # 如 "主菜选择", "饮料选择"
    
    # 可选菜品（存储菜品ID列表，JSON格式会在schema中处理）
    included_item_id = Column(String(36), ForeignKey("menu_items.id"), nullable=True)  # 包含的单个菜品
    
    # 价格调整
    price_adjustment = Column(Float, default=0.0)  # 升级加价
    
    # 数量
    quantity = Column(Integer, default=1)
    
    # 选择规则
    is_required = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    
    sort_order = Column(Integer, default=0)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    combo_menu_item = relationship("MenuItem", foreign_keys=[combo_menu_item_id], backref="combo_components")
    included_item = relationship("MenuItem", foreign_keys=[included_item_id])


class MenuSchedule(Base):
    """
    时段菜单模型
    用于定义菜品在特定时段的可用性和价格
    """
    __tablename__ = "menu_schedules"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    menu_item_id = Column(String(36), ForeignKey("menu_items.id"), nullable=False)
    
    # 时段名称
    schedule_name = Column(String(100), nullable=False)  # 如 "早餐", "午餐", "晚餐", "Happy Hour"
    
    # 时间范围 (24小时制, 如 "08:00", "11:00")
    start_time = Column(String(5), nullable=False)  # "HH:MM"
    end_time = Column(String(5), nullable=False)  # "HH:MM"
    
    # 星期几可用 (位掩码: 1=周一, 2=周二, 4=周三, 8=周四, 16=周五, 32=周六, 64=周日)
    days_of_week = Column(Integer, default=127)  # 127 = 所有天
    
    # 价格调整
    special_price = Column(Float, nullable=True)  # 特殊价格（如Happy Hour价格）
    discount_percent = Column(Float, nullable=True)  # 折扣百分比
    
    # 是否启用
    is_active = Column(Boolean, default=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    menu_item = relationship("MenuItem", backref="schedules")
