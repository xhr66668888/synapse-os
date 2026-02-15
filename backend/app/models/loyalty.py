"""
忠诚度和奖励系统模型
"""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, ForeignKey, Text, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.database import Base


class LoyaltyTier(str, enum.Enum):
    """会员等级"""
    BRONZE = "bronze"  # 青铜
    SILVER = "silver"  # 白银
    GOLD = "gold"  # 黄金
    PLATINUM = "platinum"  # 铂金
    DIAMOND = "diamond"  # 钻石


class PointTransactionType(str, enum.Enum):
    """积分交易类型"""
    EARN = "earn"  # 获得
    REDEEM = "redeem"  # 兑换
    EXPIRE = "expire"  # 过期
    BONUS = "bonus"  # 奖励
    REFUND = "refund"  # 退款
    ADJUSTMENT = "adjustment"  # 调整


class RewardType(str, enum.Enum):
    """奖励类型"""
    DISCOUNT_PERCENT = "discount_percent"  # 百分比折扣
    DISCOUNT_FIXED = "discount_fixed"  # 固定金额折扣
    FREE_ITEM = "free_item"  # 免费商品
    BONUS_POINTS = "bonus_points"  # 额外积分
    FREE_DELIVERY = "free_delivery"  # 免费配送
    PRIORITY_RESERVATION = "priority_reservation"  # 优先预订


class CustomerLoyalty(Base):
    """客户忠诚度档案"""
    __tablename__ = "customer_loyalty"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    
    # 积分系统
    points_balance = Column(Integer, default=0)  # 当前积分余额
    points_lifetime = Column(Integer, default=0)  # 终身累计积分
    
    # 会员等级
    tier = Column(Enum(LoyaltyTier), default=LoyaltyTier.BRONZE)
    tier_start_date = Column(DateTime, default=datetime.utcnow)  # 当前等级开始日期
    
    # 统计数据
    total_visits = Column(Integer, default=0)  # 总访问次数
    total_spent = Column(Float, default=0.0)  # 总消费金额
    last_visit_date = Column(DateTime, nullable=True)  # 最后访问日期
    
    # 奖励追踪
    rewards_earned = Column(Integer, default=0)  # 已获得奖励数
    rewards_redeemed = Column(Integer, default=0)  # 已兑换奖励数
    
    # 推荐系统
    referral_code = Column(String(20), unique=True, nullable=True)  # 推荐码
    referred_by = Column(String(36), ForeignKey("users.id"), nullable=True)  # 推荐人
    referrals_count = Column(Integer, default=0)  # 成功推荐数
    
    # 偏好数据
    favorite_items = Column(JSON, nullable=True)  # 喜爱的菜品ID列表
    dietary_preferences = Column(JSON, nullable=True)  # 饮食偏好
    preferred_section = Column(String(50), nullable=True)  # 偏好区域
    
    # 生日营销
    birthday = Column(DateTime, nullable=True)
    birthday_reward_claimed = Column(Boolean, default=False)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    customer = relationship("User", foreign_keys=[customer_id], backref="loyalty_profile")
    referrer = relationship("User", foreign_keys=[referred_by], backref="referrals")
    restaurant = relationship("Restaurant", backref="loyalty_members")


class PointTransaction(Base):
    """积分交易记录"""
    __tablename__ = "point_transactions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    loyalty_id = Column(String(36), ForeignKey("customer_loyalty.id"), nullable=False)
    
    # 交易信息
    transaction_type = Column(Enum(PointTransactionType), nullable=False)
    points = Column(Integer, nullable=False)  # 积分变化（正数为增加，负数为减少）
    balance_after = Column(Integer, nullable=False)  # 交易后余额
    
    # 关联信息
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=True)
    reward_id = Column(String(36), ForeignKey("rewards.id"), nullable=True)
    
    # 描述
    description = Column(Text, nullable=True)
    
    # 过期信息
    expires_at = Column(DateTime, nullable=True)  # 积分过期时间
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    loyalty = relationship("CustomerLoyalty", backref="point_transactions")
    order = relationship("Order", backref="point_transactions")


class Reward(Base):
    """奖励/优惠"""
    __tablename__ = "rewards"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    
    # 奖励信息
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    reward_type = Column(Enum(RewardType), nullable=False)
    
    # 奖励价值
    value = Column(Float, nullable=False)  # 折扣金额/百分比/积分数
    item_id = Column(String(36), ForeignKey("menu_items.id"), nullable=True)  # 免费商品ID
    
    # 兑换成本
    points_cost = Column(Integer, nullable=False)  # 兑换所需积分
    
    # 限制条件
    tier_required = Column(Enum(LoyaltyTier), nullable=True)  # 所需会员等级
    min_order_amount = Column(Float, default=0.0)  # 最低订单金额
    max_uses_per_customer = Column(Integer, nullable=True)  # 每人最多使用次数
    total_quantity = Column(Integer, nullable=True)  # 总库存
    remaining_quantity = Column(Integer, nullable=True)  # 剩余库存
    
    # 有效期
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    
    # 状态
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)  # 是否推荐
    
    # 图片
    image_url = Column(String(500), nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", backref="rewards")
    item = relationship("MenuItem", backref="rewards")


class RewardRedemption(Base):
    """奖励兑换记录"""
    __tablename__ = "reward_redemptions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    loyalty_id = Column(String(36), ForeignKey("customer_loyalty.id"), nullable=False)
    reward_id = Column(String(36), ForeignKey("rewards.id"), nullable=False)
    
    # 兑换信息
    points_spent = Column(Integer, nullable=False)
    
    # 使用状态
    status = Column(String(20), default='pending')  # pending, used, expired, cancelled
    
    # 使用信息
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=True)
    used_at = Column(DateTime, nullable=True)
    
    # 过期信息
    expires_at = Column(DateTime, nullable=False)  # 兑换券过期时间
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    loyalty = relationship("CustomerLoyalty", backref="redemptions")
    reward = relationship("Reward", backref="redemptions")
    order = relationship("Order", backref="reward_redemptions")


class LoyaltyProgram(Base):
    """忠诚度计划配置"""
    __tablename__ = "loyalty_programs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False, unique=True)
    
    # 计划基本信息
    program_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # 积分规则
    points_per_dollar = Column(Float, default=1.0)  # 每消费1元获得的积分
    signup_bonus_points = Column(Integer, default=100)  # 注册奖励积分
    referral_bonus_points = Column(Integer, default=500)  # 推荐奖励积分
    birthday_bonus_points = Column(Integer, default=200)  # 生日奖励积分
    
    # 等级门槛（基于终身积分）
    silver_threshold = Column(Integer, default=1000)
    gold_threshold = Column(Integer, default=5000)
    platinum_threshold = Column(Integer, default=15000)
    diamond_threshold = Column(Integer, default=50000)
    
    # 等级特权
    tier_benefits = Column(JSON, nullable=True)  # 各等级特权配置
    
    # 积分过期
    points_expire_months = Column(Integer, default=12)  # 积分有效期(月)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", backref="loyalty_program", uselist=False)
