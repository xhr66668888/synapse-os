"""
库存管理模型 - 原料级库存、BOM配方、库存变动、供应商管理
"""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, ForeignKey, Text, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.database import Base


class StockUnit(str, enum.Enum):
    """库存单位"""
    # 重量
    GRAM = "g"
    KILOGRAM = "kg"
    POUND = "lb"
    OUNCE = "oz"
    # 容量
    MILLILITER = "ml"
    LITER = "l"
    GALLON = "gal"
    CUP = "cup"
    # 数量
    PIECE = "pcs"
    BOX = "box"
    BAG = "bag"
    BOTTLE = "bottle"
    CAN = "can"
    PACK = "pack"


class MovementType(str, enum.Enum):
    """库存变动类型"""
    PURCHASE = "purchase"  # 采购入库
    CONSUMPTION = "consumption"  # 消耗（订单扣减）
    WASTE = "waste"  # 损耗
    ADJUSTMENT = "adjustment"  # 盘点调整
    TRANSFER = "transfer"  # 调拨
    RETURN = "return"  # 退货


class PurchaseOrderStatus(str, enum.Enum):
    """采购订单状态"""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    ORDERED = "ordered"
    PARTIAL_RECEIVED = "partial_received"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class Ingredient(Base):
    """原料模型"""
    __tablename__ = "ingredients"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    
    # 基础信息
    name = Column(String(100), nullable=False)
    sku = Column(String(50), nullable=True)  # 库存单位码
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)  # 原料分类：肉类、蔬菜、调料等
    
    # 库存信息
    unit = Column(Enum(StockUnit), nullable=False)
    current_stock = Column(Float, default=0.0)  # 当前库存量
    reserved_stock = Column(Float, default=0.0)  # 预留库存（已下单未消耗）
    
    # 库存预警
    low_stock_threshold = Column(Float, default=10.0)  # 低库存预警阈值
    reorder_point = Column(Float, default=20.0)  # 自动补货点
    reorder_quantity = Column(Float, default=50.0)  # 建议补货数量
    
    # 成本
    cost_per_unit = Column(Float, default=0.0)  # 单位成本
    last_cost = Column(Float, nullable=True)  # 最近采购成本
    average_cost = Column(Float, nullable=True)  # 平均成本
    
    # 供应商
    primary_supplier_id = Column(String(36), ForeignKey("suppliers.id"), nullable=True)
    
    # 存储要求
    storage_location = Column(String(100), nullable=True)  # 存储位置
    storage_temp = Column(String(50), nullable=True)  # 存储温度要求
    shelf_life_days = Column(Integer, nullable=True)  # 保质期（天）
    
    # 状态
    is_active = Column(Boolean, default=True)
    is_trackable = Column(Boolean, default=True)  # 是否追踪库存
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", backref="ingredients")
    primary_supplier = relationship("Supplier", backref="primary_ingredients")
    recipes = relationship("Recipe", back_populates="ingredient")
    stock_movements = relationship("StockMovement", back_populates="ingredient")
    
    @property
    def available_stock(self):
        """可用库存 = 当前库存 - 预留库存"""
        return self.current_stock - self.reserved_stock
    
    @property
    def is_low_stock(self):
        """是否低库存"""
        return self.current_stock <= self.low_stock_threshold
    
    @property
    def needs_reorder(self):
        """是否需要补货"""
        return self.current_stock <= self.reorder_point


class Recipe(Base):
    """配方/BOM表模型 - 定义菜品需要的原料及用量"""
    __tablename__ = "recipes"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    menu_item_id = Column(String(36), ForeignKey("menu_items.id"), nullable=False)
    ingredient_id = Column(String(36), ForeignKey("ingredients.id"), nullable=False)
    
    # 用量
    quantity_required = Column(Float, nullable=False)  # 每份菜品需要的原料量
    unit = Column(Enum(StockUnit), nullable=False)  # 用量单位
    
    # 成本计算
    is_variable = Column(Boolean, default=False)  # 是否可变（如根据客户要求增减）
    waste_factor = Column(Float, default=1.0)  # 损耗系数（如切割损耗1.1表示10%损耗）
    
    # 备注
    notes = Column(Text, nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    menu_item = relationship("MenuItem", backref="recipes")
    ingredient = relationship("Ingredient", back_populates="recipes")


class StockMovement(Base):
    """库存变动记录模型"""
    __tablename__ = "stock_movements"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ingredient_id = Column(String(36), ForeignKey("ingredients.id"), nullable=False)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    
    # 变动类型
    movement_type = Column(Enum(MovementType), nullable=False)
    
    # 数量
    quantity = Column(Float, nullable=False)  # 正数=增加，负数=减少
    unit = Column(Enum(StockUnit), nullable=False)
    
    # 变动前后库存
    stock_before = Column(Float, nullable=False)
    stock_after = Column(Float, nullable=False)
    
    # 成本信息
    unit_cost = Column(Float, nullable=True)
    total_cost = Column(Float, nullable=True)
    
    # 关联信息
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=True)  # 关联订单
    order_item_id = Column(String(36), nullable=True)  # 关联订单项
    purchase_order_id = Column(String(36), ForeignKey("purchase_orders.id"), nullable=True)  # 关联采购单
    
    # 原因/备注
    reason = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)
    
    # 操作人
    staff_id = Column(String(36), ForeignKey("staff.id"), nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    ingredient = relationship("Ingredient", back_populates="stock_movements")
    restaurant = relationship("Restaurant", backref="stock_movements")
    order = relationship("Order", backref="stock_movements")
    purchase_order = relationship("PurchaseOrder", backref="stock_movements")
    staff = relationship("Staff", backref="stock_movements")


class Supplier(Base):
    """供应商模型"""
    __tablename__ = "suppliers"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    
    # 基础信息
    name = Column(String(100), nullable=False)
    contact_name = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(500), nullable=True)
    
    # 商务信息
    payment_terms = Column(String(50), nullable=True)  # 付款条款
    lead_time_days = Column(Integer, default=1)  # 配送周期（天）
    minimum_order = Column(Float, nullable=True)  # 最低订购金额
    
    # 评价
    rating = Column(Float, nullable=True)  # 评分 1-5
    
    # 状态
    is_active = Column(Boolean, default=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", backref="suppliers")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")


class PurchaseOrder(Base):
    """采购订单模型"""
    __tablename__ = "purchase_orders"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    supplier_id = Column(String(36), ForeignKey("suppliers.id"), nullable=False)
    
    # 订单信息
    order_number = Column(String(20), nullable=False, index=True)
    status = Column(Enum(PurchaseOrderStatus), default=PurchaseOrderStatus.DRAFT)
    
    # 金额
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    shipping = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    
    # 日期
    order_date = Column(DateTime, nullable=True)
    expected_date = Column(DateTime, nullable=True)
    received_date = Column(DateTime, nullable=True)
    
    # 备注
    notes = Column(Text, nullable=True)
    
    # 操作人
    created_by = Column(String(36), ForeignKey("staff.id"), nullable=True)
    approved_by = Column(String(36), ForeignKey("staff.id"), nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", backref="purchase_orders")
    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    creator = relationship("Staff", foreign_keys=[created_by], backref="created_purchase_orders")
    approver = relationship("Staff", foreign_keys=[approved_by], backref="approved_purchase_orders")


class PurchaseOrderItem(Base):
    """采购订单明细模型"""
    __tablename__ = "purchase_order_items"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    purchase_order_id = Column(String(36), ForeignKey("purchase_orders.id"), nullable=False)
    ingredient_id = Column(String(36), ForeignKey("ingredients.id"), nullable=False)
    
    # 订购信息
    quantity_ordered = Column(Float, nullable=False)
    quantity_received = Column(Float, default=0.0)
    unit = Column(Enum(StockUnit), nullable=False)
    
    # 价格
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    
    # 备注
    notes = Column(Text, nullable=True)
    
    # 关系
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    ingredient = relationship("Ingredient", backref="purchase_order_items")


class InventoryCount(Base):
    """盘点记录模型"""
    __tablename__ = "inventory_counts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    
    # 盘点信息
    count_date = Column(DateTime, nullable=False)
    status = Column(String(20), default="in_progress")  # in_progress, completed, cancelled
    
    # 盘点类型
    count_type = Column(String(20), default="full")  # full, partial, cycle
    
    # 统计
    total_items = Column(Integer, default=0)
    items_counted = Column(Integer, default=0)
    variance_count = Column(Integer, default=0)  # 有差异的项目数
    variance_value = Column(Float, default=0.0)  # 差异总金额
    
    # 操作人
    counted_by = Column(String(36), ForeignKey("staff.id"), nullable=True)
    approved_by = Column(String(36), ForeignKey("staff.id"), nullable=True)
    
    # 备注
    notes = Column(Text, nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # 关系
    restaurant = relationship("Restaurant", backref="inventory_counts")
    count_items = relationship("InventoryCountItem", back_populates="inventory_count", cascade="all, delete-orphan")


class InventoryCountItem(Base):
    """盘点明细模型"""
    __tablename__ = "inventory_count_items"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    inventory_count_id = Column(String(36), ForeignKey("inventory_counts.id"), nullable=False)
    ingredient_id = Column(String(36), ForeignKey("ingredients.id"), nullable=False)
    
    # 盘点数据
    system_quantity = Column(Float, nullable=False)  # 系统库存
    counted_quantity = Column(Float, nullable=True)  # 盘点数量
    variance = Column(Float, nullable=True)  # 差异
    
    # 成本
    unit_cost = Column(Float, nullable=True)
    variance_value = Column(Float, nullable=True)  # 差异金额
    
    # 状态
    is_counted = Column(Boolean, default=False)
    
    # 备注
    notes = Column(Text, nullable=True)
    
    # 关系
    inventory_count = relationship("InventoryCount", back_populates="count_items")
    ingredient = relationship("Ingredient", backref="count_items")
