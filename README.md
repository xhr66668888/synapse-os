# Synapse OS

> AI 驱动的智能餐饮操作系统

---

## 项目简介

**Synapse OS** 是一套面向现代餐饮企业的全栈 SaaS 平台。系统整合了收银管理、厨房控制、客户运营和炒菜机器人自动化控制为一体，核心差异化在于深度 AI 集成和烹饪机器人自动化能力。

**产品矩阵:**

| 产品线 | 代号 | 说明 |
|--------|------|------|
| **Gold** | The Brain | 完整 C2M 个性化引擎 — 用户口味画像、动态菜单 |
| **Standard** | The Hand | 炒菜机器人自动化 — G-Code 控制、视觉库存监控 |
| **Lite** | The Eye | 纯软件 SaaS 收银 — 无需机器人硬件 |
| **Care** | The Shield | 无障碍模式 — 触觉/振动 UI，服务听障员工 |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **后端 (当前)** | Python 3.11, FastAPI 0.109, SQLAlchemy 2.0 (异步), Pydantic v2 |
| **后端 (目标)** | Go 1.22 (核心业务), Rust (支付/实时), C++ (机器人/视觉) |
| **前端** | Next.js 15, React 19, TypeScript, Tailwind CSS 3.4, Zustand, React Query |
| **数据库** | PostgreSQL 14+ (asyncpg), Redis 7 (缓存/发布订阅) |
| **AI** | OpenAI 兼容 SDK (ZhipuAI GLM-4), Whisper (语音转文字) |
| **基础设施** | Docker Compose (开发), Terraform + Azure AKS (生产) |
| **机器人** | C++ G-Code 管道 → 串口/TCP → 炒菜机器人 |

---

## 仓库结构

```
synapse-os/
├── services/                   # [新] 微服务单仓
│   ├── gateway/                # Go — API 网关 + 认证 (Gin)
│   ├── order-service/          # Go — 订单生命周期 (gRPC)
│   ├── menu-service/           # Go — 菜单管理
│   ├── table-service/          # Go — 桌台管理
│   ├── staff-service/          # Go — 员工与排班
│   ├── inventory-service/      # Go — 库存追踪
│   ├── report-service/         # Go — 数据分析
│   ├── reservation-service/    # Go — 预订与等位
│   ├── loyalty-service/        # Go — 积分与奖励
│   ├── payment-engine/         # Rust — 支付引擎 (Stripe/Square)
│   ├── event-bus/              # Rust — WebSocket + 事件路由
│   ├── analytics-pipeline/     # Rust — 数据处理
│   ├── robot-controller/       # C++ — G-Code 机器人控制 (中国团队)
│   ├── vision-engine/          # C++ — 视觉库存监控 (中国团队)
│   ├── taste-engine/           # C++ — 口味 C2M 引擎 (中国团队)
│   └── ai-service/             # Python — LLM、语音识别、推荐引擎
│
├── proto/synapse/v1/           # gRPC Protobuf 接口定义
│   ├── common.proto            # 公共类型 (分页、金额)
│   ├── order.proto             # 订单服务 (6 个 RPC)
│   ├── robot.proto             # 机器人控制服务 (5 个 RPC)
│   └── payment.proto           # 支付服务 (4 个 RPC)
│
├── backend/                    # Python/FastAPI (当前运行版本，正在迁移)
├── frontend/                   # Next.js 15 (管理后台 + 客户端)
│
├── infra/                      # 基础设施即代码
│   ├── terraform/              # Azure 资源 (AKS, PostgreSQL, Redis)
│   ├── k8s/                    # Kubernetes 部署清单
│   └── docker/                 # 各服务 Dockerfile
│
├── .github/workflows/ci.yml   # CI/CD (Go/Rust/C++/Python/Frontend)
├── Cargo.toml                  # Rust 工作区根配置
├── docker-compose.yml          # 本地开发编排
├── ENGINEERING.md              # 工程师维护手册
└── README.md                   # 本文件
```

> **说明:** `backend/` 中的 Python/FastAPI 是当前可运行的 v0.9 版本。业务逻辑正在逐步迁移到 `services/` 中的 Go/Rust/C++ 服务。参见 `ENGINEERING.md` 附录 B 查看各文件实现状态。

---

## 功能实现状态

### 已实现且可用

| 模块 | 后端 | 前端 | 说明 |
|------|------|------|------|
| 收银系统 (POS) | 完整 CRUD | 完整 UI | 分单、课程管理、小费计算 |
| 菜单管理 | 已实现 | 已实现 | 分类、菜品、修饰符 |
| 订单管理 | 已实现 | 已实现 | 全部订单类型，状态追踪 |
| 桌台管理 | 已实现 | 已实现 | 可视化布局、二维码生成 |
| 厨显 (KDS) | 已实现 | 已实现 | WebSocket 实时推送、计时器 |
| 预订管理 | 已实现 | 已实现 | 预订 + 等位队列 |
| 二维码点餐 | 已实现 | 已实现 | 移动端优化 |
| 自助点餐机 | 已实现 | 已实现 | 触屏优化、自动重置 |
| 取餐屏 | 已实现 | 已实现 | 大屏显示、动画效果 |
| 机器人烹饪控制 | 已实现 API | 已实现 UI | G-Code 生成、状态监控 |
| AI 多智能体 | 已实现 | 无聊天 UI | 任务分解、Whisper 语音识别 |
| 忠诚度计划 | 完整 | 部分 UI | 5级体系、积分、奖励 |

### 仅数据模型 (无外部集成)

| 模块 | 已有 | 缺少 |
|------|------|------|
| **支付处理** | 数据模型、API 桩 | Stripe/Square API 对接 |
| **短信营销** | Campaign/Log 模型 | Twilio/云短信服务商 |
| **多店管理** | Organization/Location 模型 | 完整 REST API |
| **评论聚合** | Review 模型、AI 回复逻辑 | Google/Yelp API 对接 |
| **视觉库存** | 概念设计 | OpenCV/YOLO 模型、摄像头驱动 |
| **排班优化** | Shift 模型 | 优化算法 |
| **智能推荐** | 基础逻辑 | ML 模型训练管道 |

### 未开始

| 模块 | 优先级 |
|------|--------|
| 移动端 App (iOS/Android) | 高 |
| 离线优先 / 本地数据同步 | 高 |
| 品牌官网 | 中 |
| 礼品卡系统 | 中 |
| 财务集成 (QuickBooks) | 低 |
| 供应链管理 | 低 |

---

## 快速开始

### 前置条件

- Python 3.11+
- Node.js 18+
- Docker 和 Docker Compose（推荐）
- PostgreSQL 14+
- Redis 7+（本地开发可选）

### 方式一: Docker（推荐）

```bash
git clone https://github.com/your-org/synapse-os.git
cd synapse-os
docker-compose up -d

# 后端 API:  http://localhost:8000
# API 文档:  http://localhost:8000/docs
# 前端:      http://localhost:3000
```

### 方式二: 手动启动

```bash
# 后端
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # 修改数据库配置
uvicorn app.main:app --reload --port 8000

# 前端（新终端）
cd frontend
npm install
cp .env.local.example .env.local  # 修改 API 地址
npm run dev
```

---

## API 概览

基础地址: `http://localhost:8000/api/v1`

| 路径前缀 | 说明 |
|----------|------|
| `/auth` | 登录、注册、JWT 令牌 |
| `/menu` | 菜单分类与菜品 |
| `/modifiers` | 菜品修饰符 |
| `/orders` | 订单生命周期管理 |
| `/payments` | 支付记录（桩） |
| `/inventory` | 库存追踪 |
| `/schedule` | 员工排班 |
| `/reports` | 经营分析 |
| `/tables` | 桌台与二维码管理 |
| `/staff` | 员工管理 |
| `/robot` | 机器人烹饪控制 |
| `/reservations` | 预订与等位 |
| `/loyalty` | 忠诚度计划 |
| `/agent/*` | AI 多智能体服务 |

接口文档: `http://localhost:8000/docs` (Swagger UI)

---

## 环境变量

详见 `backend/.env.example` 和 `frontend/.env.local.example`。

**后端关键变量:**

| 变量 | 是否必填 | 说明 |
|------|----------|------|
| `DATABASE_URL` | 是 | PostgreSQL 异步连接字符串 |
| `SECRET_KEY` | 是 | JWT 签名密钥（生产环境必须修改） |
| `REDIS_URL` | 否 | Redis 连接（默认 localhost） |
| `ZHIPU_API_KEY` | AI 功能 | 智谱 AI API 密钥 |
| `STRIPE_SECRET_KEY` | 未来 | Stripe 支付对接 |
| `TWILIO_ACCOUNT_SID` | 未来 | 短信通知 |

---

## 许可证

专有软件 — 版权所有 (c) 2026 Panshaker Inc.
