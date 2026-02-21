# Synapse OS — 工程师维护手册

> v0.9 → v2.0 商用化路线图

**最后更新:** 2026-02-21
**读者:** Synapse OS 后端、前端、运维工程师

---

## 目录

1. [当前架构概述](#1-当前架构概述)
2. [代码审计与技术债务](#2-代码审计与技术债务)
3. [功能实现状态](#3-功能实现状态)
4. [留空接口清单](#4-留空接口清单)
5. [商用化技术栈路线图](#5-商用化技术栈路线图)
6. [目标服务架构](#6-目标服务架构)
7. [数据库迁移计划](#7-数据库迁移计划)
8. [基础设施 (Azure)](#8-基础设施-azure)
9. [开发工作流](#9-开发工作流)
10. [安全清单](#10-安全清单)

---

## 1. 当前架构概述

### 系统架构图 (现状)

```
┌──────────────┐     ┌──────────────┐
│  Next.js 15  │────▶│  FastAPI      │
│  React 19    │ HTTP│  Python 3.11  │
│  端口 3000   │ WS  │  端口 8000    │
└──────────────┘     └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │              │
               ┌────▼────┐  ┌─────▼────┐
               │PostgreSQL│  │  Redis    │
               │  :5432   │  │  :6379   │
               └─────────┘  └──────────┘
```

### 后端技术栈

| 组件 | 技术 | 版本 | 状态 |
|------|------|------|------|
| Web 框架 | FastAPI | 0.109.2 | 生产可用 |
| ORM | SQLAlchemy (异步) | 2.0.25 | 正常 |
| 数据库驱动 | asyncpg | 0.29.0 | 正常 |
| 数据迁移 | Alembic | 1.13.1 | 无迁移文件 |
| 缓存 | Redis | 5.0.1 (客户端) | 已连接但未充分利用 |
| 认证 | python-jose + passlib | 3.3.0 / 1.7.4 | JWT 方案 |
| AI | OpenAI SDK (ZhipuAI) | >=1.0.0 | 多智能体管道 |
| 语音识别 | openai-whisper | >=20231117 | 可选，需要 ffmpeg |

### 前端技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 15.1.0 |
| UI 库 | React | 19.0.0 |
| 语言 | TypeScript | 5.6.0 |
| CSS | Tailwind CSS | 3.4.0 |
| 状态管理 | Zustand + React Query | 5.0.0 / 5.60.0 |
| 图表 | Chart.js + react-chartjs-2 | 4.5.1 / 5.3.1 |
| 数据库客户端 | Supabase JS | 2.93.2 |

### 关键文件

| 文件 | 用途 |
|------|------|
| `backend/app/main.py` | FastAPI 应用入口、CORS、生命周期 |
| `backend/app/config.py` | Pydantic Settings 配置 |
| `backend/app/database.py` | SQLAlchemy 引擎 + 会话工厂 |
| `backend/app/api/v1/router.py` | 路由注册 (14 个路由器) |
| `frontend/app/layout.tsx` | 根布局 |
| `frontend/lib/api.ts` | API 客户端 (27KB — 巨型单文件) |
| `frontend/lib/auth.tsx` | 认证上下文 + JWT 处理 |
| `docker-compose.yml` | 本地开发: PostgreSQL + Redis + 后端 + 前端 |

---

## 2. 代码审计与技术债务

### 已解决的严重问题 (2026-02-21)

#### 2.1 ~~第三方仓库混入项目~~ → 已删除
`MobileAgent-main/` (984 文件)、`Open-AutoGLM-main/` (56 文件)、`UI-TARS-main/` (22 文件) 已全部删除。清理约 140MB 研究仓库。

#### 2.2 ~~旧版前端仍在目录树中~~ → 已删除
`legacy-synapse-os/`（旧版 Vite/React SPA）已删除。

#### 2.3 ~~根目录文件散乱~~ → 已整理
资产已移至规范目录:
- `assets/fonts/myfont.ttf`
- `assets/images/logo.png`、`synapseoslogo.png`、`profile.jpeg`
- `docs/marketing/description-page-AD.html`
- 过时文档（`DEVELOPMENT.md`、`FEATURE_UPDATE.md`）已删除
- 空目录 `icon_url/` 已删除

#### 2.4 ~~.gitignore 过于简陋~~ → 已修复
`.gitignore` 已扩展为完整版，涵盖 Python、Node、环境文件、构建产物、操作系统文件、IDE 配置。

### 中等问题

#### 2.5 测试覆盖率接近零
仅有 1 个测试文件: `backend/tests/test_task_decomposer.py`。以下部分无测试:
- API 端点
- 认证流程
- 数据库操作
- 前端（无 Jest/Vitest/Playwright）

#### 2.6 无数据库迁移
Alembic 在 `requirements.txt` 中但无 `alembic/` 目录或迁移文件。应用使用 `Base.metadata.create_all()` 启动 — 原型阶段可接受，生产环境的 schema 演进不可行。

#### 2.7 双数据库访问策略冲突
前端通过 `@supabase/supabase-js` 直接访问数据库，后端通过 FastAPI/SQLAlchemy 也访问同一数据库。会导致:
- 写入竞态条件
- 认证模型不一致
- `supabase/schema.sql` 与 SQLAlchemy 模型之间的 schema 漂移

**决策:** 单一数据访问源 — 仅通过后端 API（生产环境推荐方案）。

#### 2.8 巨型 API 客户端文件 (`frontend/lib/api.ts` — 27KB)
所有 API 调用集中在一个文件中。应按业务域拆分（订单、菜单、支付等）。

#### 2.9 无 CI/CD 管道
无 GitHub Actions、无代码检查强制执行、无自动化测试。

### 低优先级

- 无日志基础设施（仅 `print()` 语句）
- 无请求限流实现
- 无 API 版本管理（仅 URL 前缀 `/api/v1`）
- `docker-compose.yml` 暴露了开发密码

---

## 3. 功能实现状态

### 完整功能

以下模块具有完整的后端 API + 前端 UI，可处理真实流量:

1. **收银系统** — 建单、购物车、分单、课程管理、小费计算
2. **菜单管理** — 分类、菜品、修饰符的增删改查
3. **订单管理** — 完整生命周期: 待处理 → 准备中 → 完成 → 结单
4. **桌台管理** — 可视化布局、状态追踪、二维码生成
5. **厨显 (KDS)** — WebSocket 实时订单显示、状态更新、计时器
6. **预订管理** — 预订创建、等位队列、座位分配
7. **二维码点餐** — 移动端优化的顾客自助点餐流程
8. **自助点餐机** — 触屏优化、双语、空闲自动重置
9. **取餐屏** — 大屏订单状态显示，含动画效果
10. **员工管理** — 增删改查、角色分配
11. **库存** — 库存项、出入库记录、补货点
12. **报表** — 营收、菜品销售、趋势
13. **机器人控制** — G-Code 生成、状态监控、任务队列
14. **AI 多智能体** — 任务分解、多智能体协调、Whisper 语音识别

### 仅有数据模型，无外部服务集成

以下模块有 SQLAlchemy 模型和部分 API 桩，但**无真实外部服务对接**:

1. **支付处理** — `payment.py` 模型存在，Stripe/Square API 未连接
2. **忠诚度计划** — 完整模型 + API，前端 UI 不完整
3. **多店管理** — Organization/Location 模型，无 API 端点
4. **评论管理** — Review 模型 + AI 回复生成，无 Google/Yelp API
5. **短信营销** — Campaign/Log 模型，无 Twilio/短信服务商
6. **排班优化** — Shift 模型存在，优化算法未实现
7. **AI 推荐** — 基础推荐服务，无 ML 模型

---

## 4. 留空接口清单

> **以下 API 端点已声明或文档化，但未连接任何真实服务。调用将返回错误或空响应。**

### 支付网关

| 端点 | 文件 | 状态 |
|------|------|------|
| `POST /payments/stripe/create-payment-intent` | `api/v1/payments.py` | 桩 — 无 Stripe SDK |
| `POST /payments/stripe/webhook` | `api/v1/payments.py` | 桩 |
| `POST /payments/refund` | `api/v1/payments.py` | 桩 |

### 短信/邮件通知

| 端点 | 文件 | 状态 |
|------|------|------|
| 短信发送 | `models/review.py` (仅 SMSCampaign/SMSLog 模型) | 无 Twilio SDK |
| 邮件通知 | 未在任何地方实现 | 无 SendGrid/SES |

### 多店管理

| 端点 | 文件 | 状态 |
|------|------|------|
| 组织增删改查 | `models/organization.py` (仅模型) | 无 API 路由 |
| 门店增删改查 | 同上 | 无 API 路由 |
| 跨店调拨 | 同上 | 无 API 路由 |

### 计算机视觉 / 库存监控

| 组件 | 状态 |
|------|------|
| 摄像头驱动集成 | 未开始 |
| 目标检测模型 (YOLO/OpenCV) | 未开始 |
| 实时库存扣减 | 未开始 |
| 超卖熔断 | 未开始 |

### AI 功能 (计划对接: MiniMax API)

| 组件 | 当前状态 | 计划 |
|------|----------|------|
| LLM 服务商 | ZhipuAI GLM-4 | → MiniMax API (留空，待对接) |
| AI 聊天 UI | 无前端 | → 需要前端聊天组件 |
| 对话历史 | 未持久化 | → 需要数据库存储 |
| 语音输入 | Whisper 可用但无 UI | → 需要前端麦克风组件 |
| 智能推荐 | 仅基础逻辑 | → 需要 MiniMax ML 管道 |

---

## 5. 商用化技术栈路线图

### 目标架构 (v2.0)

基于 Toast、Chowbus、MenuSifu 的竞品分析，推荐以下商用级技术栈:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          客户端层                                       │
├───────────────┬───────────────┬───────────┬──────────────┬──────────────┤
│  Android POS  │  Web 管理后台 │ 移动端App │  点餐机/厨显 │  取餐屏      │
│  (Kotlin)     │  (Next.js)    │ (Flutter) │  (React)     │  (React)     │
└───────┬───────┴───────┬───────┴─────┬─────┴──────┬───────┴──────┬───────┘
        │               │             │            │              │
        └───────────────┴─────────────┴────────────┴──────────────┘
                                    │
                          ┌─────────▼──────────┐
                          │  Azure API 管理    │
                          │  (API 网关)        │
                          └─────────┬──────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼───────┐  ┌────────────────▼────────────┐  ┌──────────▼──────────┐
│  Go 服务      │  │   Rust 服务                  │  │  C++ 服务           │
│               │  │                              │  │                     │
│ - 订单 API    │  │ - 支付引擎                   │  │ - 机器人控制器      │
│ - 菜单 API    │  │ - 实时事件总线               │  │   (G-Code 管道)     │
│ - 认证/权限   │  │ - 数据分析管道               │  │ - 视觉库存引擎      │
│ - 桌台管理    │  │ - WebSocket 网关             │  │   (OpenCV + YOLO)   │
│ - 员工 API    │  │                              │  │ - 口味 C2M 引擎     │
│ - 报表 API    │  │                              │  │                     │
└───────┬───────┘  └──────────────┬───────────────┘  └──────────┬──────────┘
        │                         │                             │
        └─────────────────────────┼─────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────────┐
        │                         │                             │
┌───────▼───────┐  ┌──────────────▼───────────┐  ┌─────────────▼──────────┐
│  PostgreSQL   │  │   Redis                  │  │   Azure Blob Storage   │
│  (Azure DB)   │  │   (Azure Cache)          │  │   (图片、G-Code)       │
│               │  │   + Azure Service Bus    │  │                        │
└───────────────┘  └──────────────────────────┘  └────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   AI 服务 (Python)          │
                    │   - MiniMax API 客户端      │
                    │   - Whisper 语音识别        │
                    │   - 多智能体协调器          │
                    │   - 推荐引擎               │
                    └─────────────────────────────┘
```

### 语言/服务映射

| 服务域 | 语言 | 理由 |
|--------|------|------|
| **核心业务 API** (订单、菜单、桌台、员工、认证、报表、预订、忠诚度、库存) | **Go** | 高并发、快速启动、微服务首选。Uber/Cloudflare 验证。静态二进制部署。 |
| **支付引擎** | **Rust** | 内存安全保障金融交易，零成本抽象，编译器防止安全漏洞。PCI-DSS 合规要求。 |
| **实时事件总线** (WebSocket 网关、订单状态、厨显事件) | **Rust** | Tokio 异步运行时高效处理海量并发 WebSocket 连接。厨显实时更新亚毫秒延迟。 |
| **数据分析管道** | **Rust** | 高吞吐数据处理，销售分析、趋势计算。 |
| **机器人控制器** (G-Code 生成、机器通信) | **C++** | 硬件直通、实时控制环路，与机器人固件（C/C++）集成。油温/翻炒控制亚毫秒时序。 |
| **计算机视觉引擎** (库存监控、食物识别) | **C++** | OpenCV 和 YOLO 推理原生 C++。CUDA/TensorRT GPU 加速实时目标检测。 |
| **口味 C2M 引擎** (用户口味计算) | **C++** | 高计算密度的口味画像匹配、辣度计算和食谱参数优化。 |
| **AI/ML 服务** (LLM 集成、推荐、语音) | **Python** | 最丰富的 ML 生态（PyTorch、HuggingFace、OpenAI SDK）。MiniMax API 客户端。 |
| **管理后台** | **Next.js (TypeScript)** | 保持现有技术栈 — SSR、React 生态、已有 UI。 |
| **Android POS 终端** | **Kotlin** | 行业标准（Toast 使用 Kotlin）。深度 Android 集成外设（小票机、钱箱、刷卡器）。 |
| **客户移动端** | **Flutter (Dart)** | iOS + Android 单代码库。丰富 UI 工具集。初创企业性价比高。 |

### 为什么不用纯 Python/Node.js?

| 关注点 | Python/Node.js | 我们的技术栈 |
|--------|---------------|-------------|
| 并发连接 | GIL 限制真并行 / 回调地狱 | Go goroutine (百万级并发)、Rust tokio |
| 支付安全 | 动态类型 = 更多运行时错误 | Rust 编译器在构建时捕获内存/类型错误 |
| 机器人延迟 | ~10-50ms Python 开销 | C++ <1ms 确定性控制环路 |
| CV 推理 | Python 包装器有额外开销 | C++ 原生 CUDA/TensorRT，吞吐量 10 倍 |
| 冷启动 (容器) | 2-5 秒 Python/Node | Go: <100ms, Rust: <50ms |
| 内存占用 | 50-200MB/进程 | Go: 10-30MB, Rust: 5-15MB, C++: 3-10MB |

---

## 6. 目标服务架构

### 微服务边界

```
synapse-os/
├── services/
│   ├── gateway/              # Go — API 网关 + 认证中间件
│   ├── order-service/        # Go — 订单生命周期
│   ├── menu-service/         # Go — 菜单增删改查
│   ├── table-service/        # Go — 桌台管理
│   ├── staff-service/        # Go — 员工与排班
│   ├── inventory-service/    # Go — 库存追踪
│   ├── report-service/       # Go — 分析聚合
│   ├── reservation-service/  # Go — 预订与等位
│   ├── loyalty-service/      # Go — 积分、等级、奖励
│   ├── payment-engine/       # Rust — 支付处理 (Stripe/Square)
│   ├── event-bus/            # Rust — WebSocket + 消息代理
│   ├── analytics-pipeline/   # Rust — 数据处理
│   ├── robot-controller/     # C++ — G-Code 与机器控制
│   ├── vision-engine/        # C++ — OpenCV/YOLO 库存监控
│   ├── taste-engine/         # C++ — C2M 口味计算
│   └── ai-service/           # Python — LLM、语音识别、推荐
│
├── clients/
│   ├── web-admin/            # Next.js — 管理后台
│   ├── android-pos/          # Kotlin — POS 终端
│   ├── mobile-app/           # Flutter — 客户 App
│   ├── kiosk/                # React — 自助点餐机
│   └── pickup-display/       # React — 取餐屏
│
├── infra/
│   ├── terraform/            # Azure 基础设施即代码
│   ├── k8s/                  # Kubernetes 清单
│   ├── docker/               # 各服务 Dockerfile
│   └── ci/                   # GitHub Actions 工作流
│
├── proto/                    # gRPC Protobuf 定义 (服务间通信)
├── shared/                   # 共享类型、常量
└── docs/                     # 架构文档、ADR
```

### 服务间通信

| 通信方式 | 技术 | 使用场景 |
|---------|------|---------|
| 客户端 → 网关 | HTTPS + REST (JSON) | 所有客户端请求 |
| 网关 → Go 服务 | gRPC (Protobuf) | 服务间调用，类型安全，高性能 |
| 服务 → 事件总线 | Azure Service Bus / Redis Streams | 异步事件（订单创建、支付完成） |
| 事件总线 → 客户端 | WebSocket (Rust 网关) | 厨显、取餐屏实时更新 |
| AI 服务 → Go 服务 | REST (JSON) | AI 响应返回业务逻辑 |
| 机器人控制器 ↔ 硬件 | TCP/串口 + G-Code | 与物理机器人通信 |
| 视觉引擎 → 库存 | gRPC | 库存扣减事件 |

---

## 7. 数据库迁移计划

### 阶段一: 清理当前 PostgreSQL 模式

```sql
-- 当前: 20+ 张表由 SQLAlchemy 模型定义
-- 问题:
--   1. Supabase schema.sql 与 SQLAlchemy 模型不同步
--   2. 无 Alembic 迁移历史
--   3. RLS 策略全部 "允许所有"（仅开发用）

-- 操作: 初始化 Alembic，从当前模型生成基线迁移
```

### 阶段二: Azure Database for PostgreSQL

| 配置项 | 值 |
|--------|------|
| 服务 | Azure Database for PostgreSQL - Flexible Server |
| 版本 | PostgreSQL 16 |
| 规格 | 通用型 (D2ds_v5) → 按需扩容 |
| 高可用 | 跨可用区冗余 |
| 备份 | 自动备份，35 天保留 |
| 网络 | Azure VNet 内私有端点 |

### 阶段三: 按服务拆分 Schema（最终）

微服务化后，每个 Go 服务拥有自己的数据库 Schema:

| 服务 | Schema | 核心表 |
|------|--------|--------|
| order-service | `orders` | orders, order_items |
| menu-service | `menus` | menu_categories, menu_items, modifiers |
| table-service | `tables` | tables, reservations, waitlist |
| payment-engine | `payments` | payments, refunds, cash_drawers |
| loyalty-service | `loyalty` | customer_loyalty, points, rewards |
| staff-service | `staff` | staff, schedules |
| inventory-service | `inventory` | inventory_items, transactions |
| report-service | 只读副本 | 聚合视图 |

---

## 8. 基础设施 (Azure)

### 核心 Azure 服务

| 服务 | 用途 | 规格 |
|------|------|------|
| **AKS** (Azure Kubernetes Service) | 容器编排 | Standard |
| **Azure Database for PostgreSQL** | 主数据库 | Flexible Server |
| **Azure Cache for Redis** | 会话缓存、发布订阅 | Premium（支持持久化） |
| **Azure Service Bus** | 服务间异步消息 | Standard |
| **Azure Blob Storage** | 图片、G-Code 文件、上传 | Hot 层 |
| **Azure CDN** | 静态资源分发 | Standard |
| **Azure API Management** | API 网关、限流、认证 | Developer → Standard |
| **Azure Container Registry** | Docker 镜像存储 | Basic |
| **Azure Monitor + Log Analytics** | 集中日志、APM | 按量付费 |
| **Azure Application Insights** | 前后端遥测 | Standard |
| **Azure Key Vault** | 密钥管理 | Standard |

### CI/CD 管道 (GitHub Actions)

```yaml
# .github/workflows/ci.yml (概念)
触发: push 到 main / PR
步骤:
  1. 代码检查 (golangci-lint, clippy, clang-tidy, eslint)
  2. 测试 (go test, cargo test, ctest, jest)
  3. 构建各服务 Docker 镜像
  4. 推送到 Azure Container Registry
  5. 部署到 AKS (预发布)
  6. 运行集成测试
  7. 人工审批 → 部署到 AKS (生产)
```

### 监控体系

| 工具 | 用途 |
|------|------|
| Azure Monitor | 基础设施指标 |
| Application Insights | APM、分布式链路追踪 |
| Grafana (Azure 托管) | 自定义仪表盘 |
| Azure Alerts | PagerDuty/Slack 告警 |

---

## 9. 开发工作流

### 分支策略

```
main          ← 生产就绪，受保护
├── develop   ← 集成分支
│   ├── feature/SOE-123-payment-integration
│   ├── feature/SOE-124-mobile-app
│   └── fix/SOE-125-order-race-condition
└── release/v2.0.0  ← 发布候选
```

### 本地运行

```bash
# 全栈 Docker 启动
docker-compose up -d

# 仅后端（热重载）
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 仅前端（热重载）
cd frontend
npm run dev

# 后端 API 文档
open http://localhost:8000/docs
```

### 新增 API 端点流程

1. 在 `backend/app/models/<域>.py` 创建模型
2. 在 `backend/app/schemas/<域>.py` 创建 Schema
3. 在 `backend/app/api/v1/<域>.py` 创建路由
4. 在 `backend/app/api/v1/router.py` 注册
5. 在 `backend/app/models/__init__.py` 导入模型
6. 生成迁移: `alembic revision --autogenerate -m "描述"`
7. 执行迁移: `alembic upgrade head`
8. 在 `backend/tests/test_<域>.py` 编写测试

### 代码风格

| 语言 | 格式化器 | 检查器 |
|------|---------|--------|
| Python | Black + isort | Ruff |
| TypeScript | Prettier | ESLint |
| Go (未来) | gofmt | golangci-lint |
| Rust (未来) | rustfmt | clippy |
| C++ (未来) | clang-format | clang-tidy |

---

## 10. 安全清单

### 上线前必须修复

- [ ] 修改 `SECRET_KEY`（当前值: `dev-secret-key-change-in-production`）
- [ ] 移除 `docker-compose.yml` 中的硬编码密码
- [ ] 实现正确的 Supabase RLS 策略（当前 `USING (true)`）
- [ ] 所有 API 端点添加请求限流
- [ ] 强制 HTTPS
- [ ] 实现 CSRF 防护
- [ ] 审计所有 SQL 注入风险
- [ ] 添加请求输入净化
- [ ] 生产环境移除或保护 `/docs` 和 `/redoc`

### 建议处理

- [ ] 实现 API 密钥轮换策略
- [ ] 所有数据变更添加审计日志
- [ ] 配置 Azure Key Vault 管理密钥
- [ ] 实现 OAuth 2.0 第三方集成
- [ ] 添加 Content Security Policy 头
- [ ] 支付模块 PCI-DSS 合规审查

---

## 附录 A: 清理日志

**日期:** 2026-02-21
**执行者:** 项目负责人

| 操作 | 状态 |
|------|------|
| 删除 `MobileAgent-main/`、`Open-AutoGLM-main/`、`UI-TARS-main/` | 完成 |
| 删除 `legacy-synapse-os/` | 完成 |
| 删除 `DEVELOPMENT.md`、`FEATURE_UPDATE.md` | 完成 |
| 资产移至 `assets/fonts/`、`assets/images/` | 完成 |
| 营销页面移至 `docs/marketing/` | 完成 |
| 删除 `icon_url/`、`frontend/.next.bak/` | 完成 |
| 重写 `.gitignore`（完整版） | 完成 |
| 替换 `README.md` | 完成 |
| 初始化 Alembic 迁移 | 待执行（下一阶段） |

**删除文件数:** ~1,100+
**仓库体积减少:** ~140MB+

---

## 附录 B: 微服务骨架实现状态

**日期:** 2026-02-21
**搭建者:** 项目负责人

> 以下表格列出每个微服务的文件及实现状态。
> [已搭建] = 框架可编译/运行  |  [待实现] = 接口已定义，业务逻辑未写  |  [未创建] = 文件不存在

### Go 服务 (9 个核心业务 + 1 网关)

| 服务 | 文件 | 状态 | 负责团队 |
|------|------|------|---------|
| **gateway** | `services/gateway/cmd/main.go` | [已搭建] 路由表完整 | 通用 |
| | `internal/config/config.go` | [已搭建] 15+ 服务地址配置 | 通用 |
| | `internal/middleware/auth.go` | [已搭建] JWT 认证中间件 | 通用 |
| | `internal/middleware/middleware.go` | [已搭建] CORS, 日志, 请求ID; [待实现] 限流 | 通用 |
| | `internal/handler/handler.go` | [已搭建] 框架; [待实现] 所有 ProxyTo* 方法 | 通用 |
| | `Dockerfile` | [已搭建] 多阶段构建 | 通用 |
| **order-service** | `cmd/main.go` | [已搭建] gRPC 服务器 | 通用 |
| | `internal/handler/handler.go` | [已搭建] 框架; [待实现] CRUD + 分单 | 通用 |
| | `internal/config/config.go` | [已搭建] | 通用 |
| **menu-service** | `cmd/main.go` | [已搭建] gRPC 骨架 | 通用 |
| **table-service** | `cmd/main.go` | [已搭建] gRPC 骨架 | 通用 |
| **staff-service** | `cmd/main.go` | [已搭建] gRPC 骨架 | 通用 |
| **inventory-service** | `cmd/main.go` | [已搭建] gRPC 骨架; [待实现] 与 vision-engine 联动 | 通用 + 中国团队 |
| **report-service** | `cmd/main.go` | [已搭建] gRPC 骨架 | 通用 |
| **reservation-service** | `cmd/main.go` | [已搭建] gRPC 骨架 | 通用 |
| **loyalty-service** | `cmd/main.go` | [已搭建] gRPC 骨架 | 通用 |

### Rust 服务 (Cargo Workspace)

| 服务 | 文件 | 状态 | 负责团队 |
|------|------|------|---------|
| **payment-engine** | `src/main.rs` | [已搭建] Tokio 异步框架 | 通用 |
| | `src/payment.rs` | [已搭建] 类型 + PaymentProcessor trait; [待实现] Stripe | 通用 |
| | `src/config.rs` | [已搭建] | 通用 |
| **event-bus** | `src/main.rs` | [已搭建] 骨架; [待实现] WebSocket + 事件路由 | 通用 |
| **analytics-pipeline** | `src/main.rs` | [已搭建] 骨架; [待实现] 全部 | 通用 |

### C++ 服务（中国团队重点负责）

| 服务 | 文件 | 状态 | 负责团队 |
|------|------|------|---------|
| **robot-controller** | `CMakeLists.txt` | [已搭建] 完整构建配置 | 中国硬件团队 |
| | `src/main.cpp` | [已搭建] 入口 + G-Code 演示 | 中国硬件团队 |
| | `include/.../gcode_generator.h` | [已搭建] 完整 API | 中国硬件团队 |
| | `src/gcode_generator.cpp` | [已搭建] stir_fry 基础实现; [待实现] 其余 | 中国硬件团队 |
| | `include/.../robot_controller.h` | [已搭建] 完整控制器 API | 中国硬件团队 |
| | `src/robot_controller.cpp` | [待实现] 全部占位 | 中国硬件团队 |
| | `include/.../serial_comm.h` | [已搭建] 串口通信接口 | 中国硬件团队 |
| | `src/serial_comm.cpp` | [待实现] 全部占位 | 中国硬件团队 |
| **vision-engine** | `src/main.cpp` | [已搭建] 骨架; [待实现] 全部 | 中国 AI 团队 |
| **taste-engine** | `src/main.cpp` | [已搭建] 骨架; [待实现] 全部 | 中国算法团队 |

### Python AI 服务

| 文件 | 状态 | 负责团队 |
|------|------|---------|
| `app/main.py` | [已搭建] FastAPI + 4 个端点; [待实现] 全部业务逻辑 | 通用 |
| `requirements.txt` | [已搭建] | 通用 |

### gRPC Proto 定义

| 文件 | 状态 |
|------|------|
| `proto/synapse/v1/common.proto` | [已搭建] 分页、金额、时间戳、操作结果 |
| `proto/synapse/v1/order.proto` | [已搭建] OrderService 完整 RPC 定义 (6 个方法) |
| `proto/synapse/v1/robot.proto` | [已搭建] RobotControllerService (5 个方法含 Stream) |
| `proto/synapse/v1/payment.proto` | [已搭建] PaymentService (4 个方法) |
| `proto/synapse/v1/menu.proto` | [未创建] |
| `proto/synapse/v1/table.proto` | [未创建] |
| `proto/synapse/v1/event.proto` | [未创建] |

### 基础设施

| 文件 | 状态 |
|------|------|
| `infra/terraform/main.tf` | [已搭建] AKS + PostgreSQL + Redis + ACR + Key Vault |
| `infra/k8s/base/deployment.yaml` | [已搭建] Gateway, Order, Payment, Robot 部署清单 |
| `.github/workflows/ci.yml` | [已搭建] Go/Rust/C++/Python/Frontend CI + AKS 部署 |

---

*本文档是 Synapse OS 工程团队的唯一权威技术参考。架构演进时必须同步更新。*

(c) 2026 Panshaker Inc. 版权所有
