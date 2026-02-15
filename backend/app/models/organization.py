"""
组织和多店管理模型
"""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class Organization(Base):
    """组织/企业/品牌"""
    __tablename__ = "organizations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 基本信息
    name = Column(String(100), nullable=False)  # 企业名称
    legal_name = Column(String(200), nullable=True)  # 法定名称
    description = Column(Text, nullable=True)
    
    # 联系信息
    headquarters_address = Column(String(500), nullable=True)
    contact_email = Column(String(100), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    website = Column(String(200), nullable=True)
    
    # 品牌信息
    logo_url = Column(String(500), nullable=True)
    brand_colors = Column(JSON, nullable=True)  # 品牌色配置
    
    # 状态
    is_active = Column(Boolean, default=True)
    
    # 统计
    total_locations = Column(Integer, default=0)
    total_employees = Column(Integer, default=0)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    locations = relationship("Location", back_populates="organization")
    org_users = relationship("OrganizationUser", back_populates="organization")


class Location(Base):
    """门店/位置"""
    __tablename__ = "locations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=True)
    
    # 门店信息
    location_name = Column(String(100), nullable=False)  # 门店名称
    location_code = Column(String(20), unique=True, nullable=True)  # 门店编号
    
    # 地址信息
    address_line1 = Column(String(200), nullable=True)
    address_line2 = Column(String(200), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), default="CN")
    
    # GPS坐标
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # 联系信息
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    
    # 营业信息
    business_hours = Column(JSON, nullable=True)  # 营业时间配置
    time_zone = Column(String(50), default="Asia/Shanghai")
    
    # 门店类型
    location_type = Column(String(50), nullable=True)  # dine_in, takeout_only, ghost_kitchen, etc.
    seating_capacity = Column(Integer, nullable=True)  # 座位数
    
    # 功能配置
    features_enabled = Column(JSON, nullable=True)  # 启用的功能列表
    pos_system_id = Column(String(100), nullable=True)  # POS系统标识
    
    # 状态
    status = Column(String(20), default='active')  # active, inactive, under_renovation, closed
    is_open_now = Column(Boolean, default=True)
    
    # 经理/负责人
    manager_id = Column(String(36), ForeignKey("staff.id"), nullable=True)
    
    # 统计
    total_orders_today = Column(Integer, default=0)
    revenue_today = Column(Float, default=0.0)
    
    # 时间戳
    opening_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    organization = relationship("Organization", back_populates="locations")
    restaurant = relationship("Restaurant", backref="location", uselist=False)
    manager = relationship("Staff", backref="managed_location")


class OrganizationUser(Base):
    """组织用户/员工（跨门店）"""
    __tablename__ = "organization_users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # 角色和权限
    role = Column(String(50), nullable=False)  # admin, regional_manager, multi_location_staff
    permissions = Column(JSON, nullable=True)  # 权限配置
    
    # 可访问的门店
    accessible_locations = Column(JSON, nullable=True)  # 门店ID列表，null表示全部
    primary_location_id = Column(String(36), ForeignKey("locations.id"), nullable=True)
    
    # 状态
    is_active = Column(Boolean, default=True)
    
    # 时间戳
    joined_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    organization = relationship("Organization", back_populates="org_users")
    user = relationship("User", backref="org_memberships")
    primary_location = relationship("Location", backref="primary_staff")


class LocationTransfer(Base):
    """门店间调拨/转移记录"""
    __tablename__ = "location_transfers"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    
    # 转移信息
    transfer_type = Column(String(50), nullable=False)  # inventory, staff, revenue
    from_location_id = Column(String(36), ForeignKey("locations.id"), nullable=False)
    to_location_id = Column(String(36), ForeignKey("locations.id"), nullable=False)
    
    # 详情
    details = Column(JSON, nullable=False)  # 转移详情
    notes = Column(Text, nullable=True)
    
    # 状态
    status = Column(String(20), default='pending')  # pending, in_transit, completed, cancelled
    
    # 审批
    requested_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # 时间戳
    requested_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # 关系
    from_location = relationship("Location", foreign_keys=[from_location_id], backref="transfers_out")
    to_location = relationship("Location", foreign_keys=[to_location_id], backref="transfers_in")
    requester = relationship("User", foreign_keys=[requested_by], backref="requested_transfers")
    approver = relationship("User", foreign_keys=[approved_by], backref="approved_transfers")
