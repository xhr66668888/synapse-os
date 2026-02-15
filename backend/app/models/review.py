"""
评价管理和SMS营销模型
"""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, ForeignKey, Text, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.database import Base


class ReviewPlatform(str, enum.Enum):
    """评价平台"""
    GOOGLE = "google"
    YELP = "yelp"
    DIANPING = "dianping"  # 大众点评
    MEITUAN = "meituan"  # 美团
    ELEME = "eleme"  # 饿了么
    INTERNAL = "internal"  # 内部评价系统


class ReviewStatus(str, enum.Enum):
    """评价状态"""
    PENDING = "pending"  # 待审核
    APPROVED = "approved"  # 已通过
    REJECTED = "rejected"  # 已拒绝
    RESPONDED = "responded"  # 已回复


class SMSCampaignStatus(str, enum.Enum):
    """短信营销活动状态"""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Review(Base):
    """客户评价"""
    __tablename__ = "reviews"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    customer_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=True)
    
    # 评价信息
    platform = Column(Enum(ReviewPlatform), default=ReviewPlatform.INTERNAL)
    rating = Column(Integer, nullable=False)  # 1-5星
    title = Column(String(200), nullable=True)
    content = Column(Text, nullable=True)
    
    # 细分评分
    food_rating = Column(Integer, nullable=True)  # 食物评分
    service_rating = Column(Integer, nullable=True)  # 服务评分
    atmosphere_rating = Column(Integer, nullable=True)  # 环境评分
    value_rating = Column(Integer, nullable=True)  # 性价比评分
    
    # 图片/媒体
    images = Column(JSON, nullable=True)  # 图片URL列表
    
    # 客户信息（如果未注册）
    guest_name = Column(String(100), nullable=True)
    guest_phone = Column(String(20), nullable=True)
    guest_email = Column(String(100), nullable=True)
    
    # 状态
    status = Column(Enum(ReviewStatus), default=ReviewStatus.PENDING)
    is_featured = Column(Boolean, default=False)  # 是否精选展示
    is_verified_purchase = Column(Boolean, default=False)  # 是否验证购买
    
    # 审核信息
    moderated_by = Column(String(36), ForeignKey("staff.id"), nullable=True)
    moderation_notes = Column(Text, nullable=True)
    
    # 回复
    response_content = Column(Text, nullable=True)
    responded_by = Column(String(36), ForeignKey("staff.id"), nullable=True)
    responded_at = Column(DateTime, nullable=True)
    
    # 有用性投票
    helpful_count = Column(Integer, default=0)
    unhelpful_count = Column(Integer, default=0)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", backref="reviews")
    customer = relationship("User", foreign_keys=[customer_id], backref="reviews")
    order = relationship("Order", backref="review")
    moderator = relationship("Staff", foreign_keys=[moderated_by], backref="moderated_reviews")
    responder = relationship("Staff", foreign_keys=[responded_by], backref="responded_reviews")


class ReviewRequest(Base):
    """评价请求记录"""
    __tablename__ = "review_requests"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    customer_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False)
    
    # 请求信息
    request_method = Column(String(20), nullable=False)  # sms, email, app_notification
    phone_number = Column(String(20), nullable=True)
    email_address = Column(String(100), nullable=True)
    
    # 状态
    status = Column(String(20), default='sent')  # sent, opened, completed, expired
    
    # 链接和令牌
    review_token = Column(String(100), unique=True, nullable=False)
    review_link = Column(String(500), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    
    # 时间戳
    sent_at = Column(DateTime, default=datetime.utcnow)
    opened_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # 关系
    restaurant = relationship("Restaurant", backref="review_requests")
    customer = relationship("User", backref="review_requests")
    order = relationship("Order", backref="review_request")


class SMSCampaign(Base):
    """短信营销活动"""
    __tablename__ = "sms_campaigns"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    
    # 活动信息
    campaign_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # 短信内容
    message_template = Column(Text, nullable=False)
    message_variables = Column(JSON, nullable=True)  # 变量配置
    
    # 目标受众
    target_audience = Column(String(50), nullable=False)  # all, vip, inactive, birthday, custom
    target_filter = Column(JSON, nullable=True)  # 筛选条件
    estimated_recipients = Column(Integer, default=0)
    
    # 发送设置
    send_immediately = Column(Boolean, default=False)
    scheduled_at = Column(DateTime, nullable=True)
    
    # 状态
    status = Column(Enum(SMSCampaignStatus), default=SMSCampaignStatus.DRAFT)
    
    # 统计
    total_sent = Column(Integer, default=0)
    total_delivered = Column(Integer, default=0)
    total_failed = Column(Integer, default=0)
    total_clicked = Column(Integer, default=0)  # 点击链接数
    total_conversions = Column(Integer, default=0)  # 转化数（如完成订单）
    
    # 成本
    estimated_cost = Column(Float, default=0.0)
    actual_cost = Column(Float, default=0.0)
    
    # 创建人
    created_by = Column(String(36), ForeignKey("staff.id"), nullable=False)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # 关系
    restaurant = relationship("Restaurant", backref="sms_campaigns")
    creator = relationship("Staff", backref="created_campaigns")


class SMSLog(Base):
    """短信发送日志"""
    __tablename__ = "sms_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    campaign_id = Column(String(36), ForeignKey("sms_campaigns.id"), nullable=True)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    customer_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # 短信信息
    phone_number = Column(String(20), nullable=False)
    message_content = Column(Text, nullable=False)
    message_type = Column(String(50), nullable=False)  # marketing, transactional, review_request
    
    # 状态
    status = Column(String(20), default='pending')  # pending, sent, delivered, failed, clicked
    
    # 供应商信息
    provider = Column(String(50), nullable=True)  # twilio, aliyun, tencent
    provider_message_id = Column(String(100), nullable=True)
    provider_response = Column(JSON, nullable=True)
    
    # 错误信息
    error_code = Column(String(50), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # 成本
    cost = Column(Float, default=0.0)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    clicked_at = Column(DateTime, nullable=True)
    
    # 关系
    campaign = relationship("SMSCampaign", backref="sms_logs")
    restaurant = relationship("Restaurant", backref="sms_logs")
    customer = relationship("User", backref="sms_logs")


class ReviewTemplate(Base):
    """评价回复模板"""
    __tablename__ = "review_templates"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    
    # 模板信息
    template_name = Column(String(100), nullable=False)
    template_content = Column(Text, nullable=False)
    
    # 使用条件
    rating_range = Column(String(10), nullable=True)  # e.g., "1-2", "5"
    keywords = Column(JSON, nullable=True)  # 触发关键词
    
    # 变量支持
    supports_variables = Column(Boolean, default=True)
    
    # 状态
    is_active = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    restaurant = relationship("Restaurant", backref="review_templates")
