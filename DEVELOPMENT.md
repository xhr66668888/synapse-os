# Synapse OS 开发文档

> 面向软件工程师的详细技术指南

---

## 📋 目录

- [开发环境配置](#开发环境配置)
- [项目结构](#项目结构)
- [数据库架构](#数据库架构)
- [API开发指南](#api开发指南)
- [未完成的功能](#未完成的功能)
- [技术债务](#技术债务)
- [性能优化建议](#性能优化建议)
- [安全注意事项](#安全注意事项)

---

## 🔧 开发环境配置

### 必需工具

```bash
# Python 环境
python --version  # 要求 >= 3.11
pip --version

# Node.js 环境
node --version    # 要求 >= 18.0
npm --version

# 数据库
psql --version    # PostgreSQL >= 14
redis-cli --version # Redis >= 7.0

# 版本控制
git --version

# (可选) Docker
docker --version
docker-compose --version
```

### 开发工具推荐

**IDE/编辑器:**
- VS Code + Python 扩展
- PyCharm Professional
- Cursor (AI辅助)

**VS Code 扩展:**
```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "ms-python.black-formatter",
    "charliermarsh.ruff",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-azuretools.vscode-docker"
  ]
}
```

### 环境变量配置

**后端 (`backend/.env`):**
```env
# 数据库配置
DATABASE_URL=postgresql://postgres:password@localhost:5432/synapse_os
# 或使用 SQLite 开发: sqlite:///./synapse_os.db

# Redis配置
REDIS_URL=redis://localhost:6379/0

# JWT配置
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API配置
API_V1_PREFIX=/api/v1
PROJECT_NAME=Synapse OS
VERSION=2.0.0
DEBUG=True

# CORS配置
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:8000"]

# 智谱AI配置
ZHIPU_API_KEY=your_zhipu_api_key
ZHIPU_API_BASE=https://open.bigmodel.cn/api/paas/v4

# (可选) OpenAI配置
OPENAI_API_KEY=sk-xxx
OPENAI_API_BASE=https://api.openai.com/v1

# (可选) Whisper配置
ENABLE_WHISPER=False
WHISPER_MODEL=base  # tiny, base, small, medium, large

# (待配置) 第三方服务
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
SENDGRID_API_KEY=

# 文件上传
MAX_UPLOAD_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=./logs/app.log
```

**前端 (`frontend/.env.local`):**
```env
# API配置
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_BASE_PATH=/api/v1

# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 功能开关
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_SENTRY=false

# 环境标识
NEXT_PUBLIC_ENV=development
```

---

## 📁 项目结构

### 后端结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI应用入口
│   ├── config.py               # 配置管理
│   ├── database.py             # 数据库连接
│   │
│   ├── api/                    # API路由
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py       # 主路由聚合
│   │       ├── auth.py         # 认证端点
│   │       ├── menu.py         # 菜单管理
│   │       ├── orders.py       # 订单管理
│   │       ├── tables.py       # 桌台管理 ✅ QR码集成
│   │       ├── reservations.py # 预订系统 ✅ 新增
│   │       ├── loyalty.py      # 忠诚度系统 ✅ 新增
│   │       ├── payments.py     # 支付管理 ⚠️ 需Stripe集成
│   │       ├── inventory.py    # 库存管理
│   │       ├── staff.py        # 员工管理
│   │       ├── schedule.py     # 排班管理
│   │       ├── reports.py      # 报表
│   │       ├── robot.py        # 机器人控制
│   │       ├── agent.py        # AI Agent
│   │       └── modifiers.py    # 修饰符
│   │
│   ├── models/                 # SQLAlchemy模型
│   │   ├── __init__.py
│   │   ├── user.py             # 用户模型
│   │   ├── restaurant.py       # 餐厅模型 ✅ 增加organization_id
│   │   ├── menu.py             # 菜单模型
│   │   ├── modifier.py         # 修饰符模型
│   │   ├── order.py            # 订单模型
│   │   ├── payment.py          # 支付模型
│   │   ├── inventory.py        # 库存模型
│   │   ├── table.py            # 桌位模型 ✅ 增加qr_code
│   │   ├── staff.py            # 员工模型
│   │   ├── schedule.py         # 排班模型
│   │   ├── reservation.py      # 预订模型 ✅ 新增
│   │   ├── loyalty.py          # 忠诚度模型 ✅ 新增
│   │   ├── organization.py     # 组织模型 ✅ 新增
│   │   ├── review.py           # 评价模型 ✅ 新增
│   │   └── audit.py            # 审计模型
│   │
│   ├── schemas/                # Pydantic Schema
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── menu.py
│   │   ├── order.py
│   │   ├── table.py
│   │   ├── reservation.py      # ✅ 新增
│   │   ├── modifier.py
│   │   ├── payment.py
│   │   ├── inventory.py
│   │   ├── schedule.py
│   │   ├── reports.py
│   │   └── agent.py
│   │
│   ├── services/               # 业务逻辑服务
│   │   ├── __init__.py
│   │   ├── ai.py               # AI基础服务
│   │   ├── zhipu_client.py     # 智谱AI客户端
│   │   ├── whisper_service.py  # 语音识别
│   │   ├── recommendation.py   # 推荐引擎
│   │   ├── agent_provider.py   # Agent提供者
│   │   ├── dual_agent_service.py
│   │   ├── triple_agent_service.py
│   │   ├── multi_agent_coordinator.py
│   │   ├── task_decomposer.py  # 任务分解器
│   │   ├── action_executor.py  # 动作执行器
│   │   ├── notetaker_agent.py
│   │   ├── reflector_agent.py
│   │   ├── web_agent.py
│   │   ├── expo.py             # Expo服务
│   │   ├── mobile_agent_client.py
│   │   ├── ui_tars_client.py
│   │   ├── ui_tars_enhanced.py
│   │   └── screenshot_service.py
│   │
│   └── config/                 # 配置文件
│       ├── __init__.py
│       └── prompts.py          # AI提示词
│
├── tests/                      # 测试文件
│   ├── __init__.py
│   ├── test_auth.py
│   ├── test_orders.py
│   └── test_task_decomposer.py
│
├── alembic/                    # 数据库迁移
│   ├── versions/
│   └── env.py
│
├── requirements.txt            # Python依赖
├── Dockerfile                  # Docker配置
└── .env.example                # 环境变量示例
```

### 前端结构

```
frontend/
├── app/                        # Next.js 15 App Router
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 首页/Dashboard
│   ├── globals.css             # 全局样式
│   ├── providers.tsx           # Provider组件
│   │
│   ├── login/                  # 登录页
│   ├── pos/                    # POS收银
│   ├── kds/                    # 厨房显示
│   ├── menu/                   # 菜单管理
│   ├── orders/                 # 订单管理
│   ├── tables/                 # 桌台管理 ✅ QR码功能
│   ├── reservations/           # 预订管理 ✅ 新增
│   ├── customers/              # 客户管理
│   ├── staff/                  # 员工管理
│   ├── schedule/               # 排班管理
│   ├── inventory/              # 库存管理
│   ├── reports/                # 报表
│   ├── settings/               # 设置
│   ├── profile/                # 个人资料
│   ├── ai-receptionist/        # AI客服
│   ├── cooking-robot/          # 机器人控制
│   ├── delivery/               # 配送管理
│   ├── expo/                   # Expo
│   ├── music/                  # 音乐控制
│   ├── auto-review/            # 自动评价
│   │
│   ├── qr-order/[qrCode]/      # QR码点餐 ✅ 新增
│   ├── multi-location/         # 多店管理 ✅ 新增
│   ├── pickup-screen/          # 取餐屏幕 ✅ 新增
│   ├── kiosk/                  # 自助点餐机 ✅ 新增
│   ├── reviews/                # 评价管理 ✅ 新增
│   │
│   ├── panshaker/              # PanShaker特殊页面
│   └── unauthorized/           # 未授权页面
│
├── components/                 # React组件
│   ├── pos/
│   │   └── POSContent.tsx
│   ├── kds/
│   │   └── KDSContent.tsx
│   ├── tables/
│   │   └── TablesContent.tsx   # ✅ 增加QR码功能
│   ├── customers/
│   │   └── CustomersContent.tsx
│   └── ...
│
├── hooks/                      # 自定义Hooks
│   ├── useActionExecutor.ts
│   ├── useAgentWebSocket.ts
│   └── useKDSWebSocket.ts
│
├── lib/                        # 工具库
│   ├── api.ts                  # API客户端
│   ├── auth.tsx                # 认证
│   ├── supabase.ts             # Supabase客户端
│   ├── supabase-api.ts
│   ├── ai-assistant-store.ts   # AI助手状态
│   ├── agent-executor.ts
│   └── screenshot-service.ts
│
├── public/                     # 静态资源
│   ├── assets/
│   └── logo.png
│
├── .next/                      # Next.js构建输出
├── node_modules/               # 依赖
├── package.json                # 依赖配置
├── tsconfig.json               # TypeScript配置
├── tailwind.config.ts          # Tailwind配置
├── next.config.ts              # Next.js配置
├── postcss.config.mjs          # PostCSS配置
└── .env.local                  # 本地环境变量
```

---

## 🗄️ 数据库架构

### 核心表结构

#### 用户与认证
```sql
users                    -- 用户表
├── id (PK)
├── email (UNIQUE)
├── hashed_password
├── name
├── phone
├── role (admin/manager/staff/customer)
├── restaurant_id (FK)
└── is_active

staff                    -- 员工表
├── id (PK)
├── restaurant_id (FK)
├── user_id (FK)
├── position
├── hourly_rate
└── is_active
```

#### 餐厅与组织 ✅
```sql
restaurants              -- 餐厅表
├── id (PK)
├── name
├── organization_id      -- ✅ 新增
├── location_code        -- ✅ 新增
├── license_type
└── robot_enabled

organizations            -- ✅ 新增：组织表
├── id (PK)
├── name
├── legal_name
├── headquarters_address
└── total_locations

locations                -- ✅ 新增：门店表
├── id (PK)
├── organization_id (FK)
├── restaurant_id (FK)
├── location_name
├── address
├── business_hours (JSON)
└── status
```

#### 菜单系统
```sql
menu_categories          -- 菜单分类
├── id (PK)
├── restaurant_id (FK)
├── name
└── sort_order

menu_items               -- 菜品表
├── id (PK)
├── category_id (FK)
├── restaurant_id (FK)
├── name
├── price
├── image_url
└── is_available

modifiers                -- 修饰符组
├── id (PK)
├── restaurant_id (FK)
├── name
└── type (radio/checkbox)

modifier_options         -- 修饰符选项
├── id (PK)
├── modifier_id (FK)
├── name
└── price_adjustment
```

#### 订单系统
```sql
orders                   -- 订单表
├── id (PK)
├── restaurant_id (FK)
├── customer_id (FK)
├── order_number
├── order_type (dine_in/takeout/delivery)
├── status
├── parent_order_id      -- 分单支持
├── current_course       -- 课程管理
├── total_courses
├── subtotal
├── tax
├── tip
└── total

order_items              -- 订单明细
├── id (PK)
├── order_id (FK)
├── menu_item_id (FK)
├── quantity
├── unit_price
├── selected_modifiers (JSON)
├── seat_number          -- 分单支持
├── course               -- 课程管理
├── fire_status          -- Fire状态
└── robot_status
```

#### 桌台系统 ✅
```sql
tables                   -- 桌位表
├── id (PK)
├── restaurant_id (FK)
├── table_number
├── capacity
├── status (available/occupied/reserved/cleaning)
├── qr_code              -- ✅ 新增：QR码标识
├── qr_enabled           -- ✅ 新增：是否启用QR点餐
├── position_x
└── position_y
```

#### 预订系统 ✅
```sql
reservations             -- ✅ 新增：预订表
├── id (PK)
├── restaurant_id (FK)
├── customer_id (FK)
├── confirmation_number (UNIQUE)
├── guest_name
├── guest_phone
├── guest_count
├── reservation_date
├── table_id (FK)
├── status (pending/confirmed/seated/completed/cancelled)
├── source (phone/website/ai_assistant)
└── special_requests

waitlist_entries         -- ✅ 新增：等位队列
├── id (PK)
├── restaurant_id (FK)
├── guest_name
├── guest_phone
├── party_size
├── position
├── estimated_wait_minutes
└── status (waiting/called/seated/cancelled)
```

#### 忠诚度系统 ✅
```sql
customer_loyalty         -- ✅ 新增：会员档案
├── id (PK)
├── customer_id (FK) (UNIQUE)
├── restaurant_id (FK)
├── points_balance
├── points_lifetime
├── tier (bronze/silver/gold/platinum/diamond)
├── total_visits
├── total_spent
├── referral_code (UNIQUE)
└── birthday

point_transactions       -- ✅ 新增：积分交易
├── id (PK)
├── loyalty_id (FK)
├── transaction_type (earn/redeem/expire)
├── points
├── balance_after
├── order_id (FK)
└── expires_at

rewards                  -- ✅ 新增：奖励
├── id (PK)
├── restaurant_id (FK)
├── name
├── reward_type
├── points_cost
├── tier_required
└── is_active

reward_redemptions       -- ✅ 新增：兑换记录
├── id (PK)
├── loyalty_id (FK)
├── reward_id (FK)
├── points_spent
├── status
└── expires_at
```

#### 评价与营销 ✅
```sql
reviews                  -- ✅ 新增：评价表
├── id (PK)
├── restaurant_id (FK)
├── customer_id (FK)
├── order_id (FK)
├── platform (google/yelp/dianping/meituan)
├── rating (1-5)
├── content
├── status (pending/approved/responded)
├── response_content
└── responded_at

sms_campaigns            -- ✅ 新增：SMS营销活动
├── id (PK)
├── restaurant_id (FK)
├── campaign_name
├── message_template
├── target_audience
├── status
├── total_sent
└── total_delivered

sms_logs                 -- ✅ 新增：短信日志
├── id (PK)
├── campaign_id (FK)
├── customer_id (FK)
├── phone_number
├── message_content
├── status
└── cost
```

#### 支付系统
```sql
payments                 -- 支付记录
├── id (PK)
├── order_id (FK)
├── payment_method
├── amount
├── status
├── transaction_id       -- ⚠️ 第三方交易ID
├── processor            -- ⚠️ stripe/square
└── processor_response (JSON)

refunds                  -- 退款记录
├── id (PK)
├── payment_id (FK)
├── amount
├── reason
└── status

cash_drawers             -- 现金抽屉
├── id (PK)
├── restaurant_id (FK)
├── opening_balance
├── current_balance
└── is_open
```

#### 库存系统
```sql
inventory_items          -- 库存项目
├── id (PK)
├── restaurant_id (FK)
├── name
├── unit
├── quantity
├── reorder_point
└── last_updated

inventory_transactions   -- 库存交易
├── id (PK)
├── inventory_item_id (FK)
├── transaction_type
├── quantity_change
└── reason
```

---

## 🔌 API开发指南

### 添加新的API端点

#### 1. 定义数据模型 (`app/models/`)

```python
# app/models/example.py
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class Example(Base):
    __tablename__ = "examples"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(100), nullable=False)
    value = Column(Integer, default=0)
    
    # 关系
    restaurant = relationship("Restaurant", backref="examples")
```

#### 2. 创建Pydantic Schema (`app/schemas/`)

```python
# app/schemas/example.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ExampleBase(BaseModel):
    name: str
    value: int = 0

class ExampleCreate(ExampleBase):
    restaurant_id: str

class ExampleUpdate(BaseModel):
    name: Optional[str] = None
    value: Optional[int] = None

class ExampleResponse(ExampleBase):
    id: str
    restaurant_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True
```

#### 3. 创建API路由 (`app/api/v1/`)

```python
# app/api/v1/example.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.example import Example
from app.schemas.example import ExampleCreate, ExampleResponse, ExampleUpdate

router = APIRouter()

@router.get("/", response_model=List[ExampleResponse])
async def get_examples(
    restaurant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取示例列表"""
    result = await db.execute(
        select(Example).where(Example.restaurant_id == restaurant_id)
    )
    return result.scalars().all()

@router.post("/", response_model=ExampleResponse)
async def create_example(
    example_in: ExampleCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建示例"""
    example = Example(**example_in.model_dump())
    db.add(example)
    await db.commit()
    await db.refresh(example)
    return example

@router.get("/{example_id}", response_model=ExampleResponse)
async def get_example(
    example_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取单个示例"""
    result = await db.execute(
        select(Example).where(Example.id == example_id)
    )
    example = result.scalar_one_or_none()
    if not example:
        raise HTTPException(status_code=404, detail="Example not found")
    return example

@router.put("/{example_id}", response_model=ExampleResponse)
async def update_example(
    example_id: str,
    example_in: ExampleUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新示例"""
    result = await db.execute(
        select(Example).where(Example.id == example_id)
    )
    example = result.scalar_one_or_none()
    if not example:
        raise HTTPException(status_code=404, detail="Example not found")
    
    update_data = example_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(example, key, value)
    
    await db.commit()
    await db.refresh(example)
    return example

@router.delete("/{example_id}")
async def delete_example(
    example_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除示例"""
    result = await db.execute(
        select(Example).where(Example.id == example_id)
    )
    example = result.scalar_one_or_none()
    if not example:
        raise HTTPException(status_code=404, detail="Example not found")
    
    await db.delete(example)
    await db.commit()
    return {"message": "Example deleted"}
```

#### 4. 注册路由 (`app/api/v1/router.py`)

```python
from app.api.v1 import example

api_router.include_router(example.router, prefix="/example", tags=["示例"])
```

#### 5. 创建数据库迁移

```bash
# 自动生成迁移文件
alembic revision --autogenerate -m "Add example table"

# 应用迁移
alembic upgrade head
```

---

## ❌ 未完成的功能

### 🔴 高优先级

#### 1. 支付集成 (Priority: P0)

**状态**: 数据模型完成，API待实现

**需要做的**:
```python
# app/api/v1/payments.py 需要添加:

@router.post("/stripe/create-payment-intent")
async def create_stripe_payment_intent(
    amount: float,
    order_id: str,
    db: AsyncSession = Depends(get_db)
):
    """创建Stripe支付意图 - 待实现"""
    # TODO: 集成 Stripe API
    # 1. 安装: pip install stripe
    # 2. 导入: import stripe
    # 3. 配置: stripe.api_key = settings.STRIPE_SECRET_KEY
    # 4. 创建 PaymentIntent
    # 5. 返回 client_secret
    pass

@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """处理Stripe Webhook - 待实现"""
    # TODO: 
    # 1. 验证签名
    # 2. 处理不同事件类型
    # 3. 更新订单状态
    pass
```

**参考文档**: https://stripe.com/docs/api

#### 2. SMS/Email 通知 (Priority: P0)

**状态**: 数据模型完成，发送逻辑待实现

**需要做的**:
```python
# app/services/sms_service.py - 需要创建

from twilio.rest import Client

class SMSService:
    def __init__(self):
        self.client = Client(
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_AUTH_TOKEN
        )
    
    async def send_sms(
        self,
        to: str,
        message: str,
        campaign_id: Optional[str] = None
    ):
        """发送短信 - 待实现"""
        # TODO:
        # 1. 调用 Twilio API
        # 2. 记录到 sms_logs 表
        # 3. 处理错误
        pass

    async def send_review_request(self, order_id: str):
        """发送评价请求 - 待实现"""
        pass
```

**参考文档**: 
- Twilio: https://www.twilio.com/docs/sms
- 阿里云短信: https://help.aliyun.com/product/44282.html

#### 3. 多店管理API (Priority: P0)

**状态**: 数据模型完成，API端点全部缺失

**需要创建的文件**:
```
app/api/v1/organizations.py  -- ❌ 不存在
app/api/v1/locations.py      -- ❌ 不存在
app/schemas/organization.py  -- ❌ 不存在
```

**需要实现的端点**:
```
GET    /api/v1/organizations/           
POST   /api/v1/organizations/           
GET    /api/v1/organizations/{id}       
GET    /api/v1/organizations/{id}/locations
POST   /api/v1/organizations/{id}/locations
GET    /api/v1/locations/               
POST   /api/v1/locations/               
GET    /api/v1/locations/{id}           
GET    /api/v1/locations/{id}/stats     
PUT    /api/v1/locations/{id}           
POST   /api/v1/transfers/               
```

### 🟡 中优先级

#### 4. AI客服前端界面 (Priority: P1)

**状态**: 后端完成，前端UI缺失

**需要创建**:
```tsx
// frontend/app/ai-chat/page.tsx
// 包含:
// - 聊天窗口组件
// - 消息列表
// - 输入框
// - 语音输入按钮
// - WebSocket实时通信
```

#### 5. 视觉库存监控 (Priority: P1)

**状态**: 概念设计完成，实现为0%

**需要创建**:
```python
# app/services/vision_service.py
import cv2
from ultralytics import YOLO

class VisionInventoryService:
    def __init__(self):
        self.model = YOLO('yolov8n.pt')  # 需要训练自定义模型
    
    async def detect_ingredients(self, camera_feed):
        """检测食材 - 待实现"""
        # TODO:
        # 1. 从摄像头获取图像
        # 2. YOLO检测物品
        # 3. 识别物品类别和数量
        # 4. 更新库存表
        pass
    
    async def check_stock_levels(self):
        """检查库存水平 - 待实现"""
        # TODO: 触发熔断机制
        pass
```

**需要的硬件**:
- 高清摄像头
- 边缘计算设备 (Jetson Nano / Raspberry Pi 4)

#### 6. 移动端App (Priority: P1)

**状态**: 未开始

**技术选型**:
- Option 1: React Native (推荐 - 可共享代码)
- Option 2: Flutter (性能更好)
- Option 3: 渐进式Web App (PWA)

**核心功能**:
- 用户登录/注册
- 浏览菜单
- 在线点餐
- 订单追踪
- 会员中心
- 积分和奖励

### 🟢 低优先级

#### 7. 礼品卡系统 (Priority: P2)

**状态**: 未开始

**需要创建的表**:
```sql
gift_cards
├── id (PK)
├── card_number (UNIQUE)
├── balance
├── original_value
├── status
├── purchased_by
└── expires_at

gift_card_transactions
├── id (PK)
├── gift_card_id (FK)
├── transaction_type (purchase/use/refund/transfer)
├── amount
└── order_id (FK)
```

#### 8. 会计系统集成 (Priority: P3)

**状态**: 未开始

**集成目标**:
- QuickBooks API
- Xero API

#### 9. 供应链管理 (Priority: P3)

**状态**: 未开始

**需要的功能**:
- 供应商管理
- 采购订单
- 入库管理
- 成本核算

---

## 🐛 技术债务

### 后端

1. **缺少单元测试**
   - 当前测试覆盖率: ~5%
   - 目标: >80%
   - 需要添加: pytest测试用例

2. **缺少API速率限制**
   ```python
   # 需要集成 slowapi
   from slowapi import Limiter
   ```

3. **缺少请求日志**
   ```python
   # 需要配置 structlog 或 loguru
   ```

4. **缺少错误追踪**
   ```python
   # 需要集成 Sentry
   import sentry_sdk
   ```

5. **数据库连接池未优化**
   ```python
   # app/database.py 需要优化
   # 当前: 默认配置
   # 建议: 配置 pool_size, max_overflow
   ```

### 前端

1. **缺少错误边界**
   ```tsx
   // 需要添加 ErrorBoundary 组件
   ```

2. **缺少加载骨架屏**
   ```tsx
   // 大部分页面缺少 Skeleton Loader
   ```

3. **缺少表单验证库**
   ```bash
   # 建议安装 React Hook Form + Zod
   npm install react-hook-form zod @hookform/resolvers
   ```

4. **图片未优化**
   ```tsx
   // 应该使用 Next.js Image 组件
   import Image from 'next/image'
   ```

5. **缺少PWA支持**
   ```bash
   # 需要配置 next-pwa
   npm install next-pwa
   ```

---

## ⚡ 性能优化建议

### 数据库优化

1. **添加索引**
```sql
-- 订单查询优化
CREATE INDEX idx_orders_restaurant_date ON orders(restaurant_id, created_at);
CREATE INDEX idx_orders_status ON orders(status);

-- 库存查询优化
CREATE INDEX idx_inventory_restaurant ON inventory_items(restaurant_id);

-- 积分交易优化
CREATE INDEX idx_loyalty_customer ON customer_loyalty(customer_id);
CREATE INDEX idx_points_loyalty_date ON point_transactions(loyalty_id, created_at);
```

2. **查询优化**
```python
# 使用 select_in_load 避免 N+1 问题
from sqlalchemy.orm import selectinload

result = await db.execute(
    select(Order)
    .options(selectinload(Order.items))
    .where(Order.restaurant_id == restaurant_id)
)
```

3. **分页查询**
```python
# 所有列表API应该支持分页
@router.get("/")
async def get_items(
    skip: int = 0,
    limit: int = 50,  # 默认50条
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Model).offset(skip).limit(limit)
    )
    return result.scalars().all()
```

### API优化

1. **启用响应缓存**
```python
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend

# 缓存菜单查询
@router.get("/menu/")
@cache(expire=3600)  # 缓存1小时
async def get_menu():
    pass
```

2. **启用 GZIP 压缩**
```python
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

3. **异步任务队列**
```python
# 使用 Celery 处理长时间任务
# 如: 发送短信、生成报表、训练模型

from celery import Celery

celery_app = Celery('synapse_os')

@celery_app.task
def send_sms_task(phone, message):
    # 异步发送短信
    pass
```

### 前端优化

1. **代码分割**
```tsx
// 使用动态导入
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>
})
```

2. **图片优化**
```tsx
import Image from 'next/image'

<Image
  src="/menu-item.jpg"
  width={400}
  height={300}
  alt="Menu Item"
  placeholder="blur"
  priority
/>
```

3. **API请求去重**
```tsx
// 使用 React Query 自动去重
import { useQuery } from '@tanstack/react-query'

const { data } = useQuery({
  queryKey: ['orders', restaurantId],
  queryFn: fetchOrders,
  staleTime: 5000
})
```

---

## 🔒 安全注意事项

### 认证与授权

1. **JWT Token 安全**
```python
# ✅ 已实现
# ❌ 待改进: 添加 refresh token rotation
# ❌ 待改进: 添加 token blacklist
```

2. **密码策略**
```python
# ❌ 需要添加
# - 密码复杂度验证
# - 密码历史记录
# - 登录失败锁定
```

3. **API密钥管理**
```python
# ❌ 需要实现
# - API密钥生成
# - 密钥轮换
# - 密钥权限控制
```

### 数据安全

1. **敏感数据加密**
```python
# ⚠️ 需要加密的字段:
# - 银行卡号
# - 身份证号
# - 电话号码 (部分场景)

from cryptography.fernet import Fernet

def encrypt_sensitive_data(data: str) -> str:
    # TODO: 实现加密
    pass
```

2. **SQL注入防护**
```python
# ✅ 已通过 SQLAlchemy ORM 防护
# ⚠️ 注意: 不要使用原始SQL查询
```

3. **XSS防护**
```tsx
// ✅ React自动转义
// ⚠️ 注意: 不要使用 dangerouslySetInnerHTML
```

4. **CSRF防护**
```python
# ❌ 需要添加
from fastapi_csrf_protect import CsrfProtect
```

### 请求安全

1. **速率限制**
```python
# ❌ 待实现
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/minute")
async def login():
    pass
```

2. **请求大小限制**
```python
# app/main.py
app.add_middleware(
    # ❌ 待配置
    RequestSizeLimitMiddleware,
    max_upload_size=10 * 1024 * 1024  # 10MB
)
```

---

## 📞 获取帮助

### 内部资源
- **技术文档**: `/docs` (本文件)
- **API文档**: `http://localhost:8000/docs`
- **架构图**: `ARCHITECTURE.md` (待创建)

### 外部资源
- **FastAPI文档**: https://fastapi.tiangolo.com/
- **Next.js文档**: https://nextjs.org/docs
- **SQLAlchemy文档**: https://docs.sqlalchemy.org/
- **Tailwind CSS**: https://tailwindcss.com/docs

### 团队联系
- **技术负责人**: [TBD]
- **后端团队**: [TBD]
- **前端团队**: [TBD]

---

**最后更新**: 2026-01-28  
**文档版本**: v1.0  
**维护者**: Synapse OS Development Team
