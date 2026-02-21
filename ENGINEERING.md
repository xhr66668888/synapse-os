# Synapse OS — Engineering Maintenance Guide

> 工程师技术维护手册 | v0.9 → v2.0 商用化路线图

**Last Updated:** 2026-02-21  
**Audience:** Backend/Frontend/DevOps engineers on the Synapse OS team

---

## Table of Contents

1. [Current Architecture Overview](#1-current-architecture-overview)
2. [Code Audit & Technical Debt](#2-code-audit--technical-debt)
3. [Feature Implementation Status](#3-feature-implementation-status)
4. [Unimplemented Interfaces (留空接口)](#4-unimplemented-interfaces)
5. [Commercial Tech Stack Roadmap](#5-commercial-tech-stack-roadmap)
6. [Service Architecture (Target)](#6-service-architecture-target)
7. [Database Migration Plan](#7-database-migration-plan)
8. [Infrastructure (Azure)](#8-infrastructure-azure)
9. [Development Workflow](#9-development-workflow)
10. [Security Checklist](#10-security-checklist)

---

## 1. Current Architecture Overview

### System Diagram (As-Is)

```
┌──────────────┐     ┌──────────────┐
│  Next.js 15  │────▶│  FastAPI      │
│  React 19    │ HTTP│  Python 3.11  │
│  Port 3000   │ WS  │  Port 8000    │
└──────────────┘     └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │              │
               ┌────▼────┐  ┌─────▼────┐
               │PostgreSQL│  │  Redis    │
               │  :5432   │  │  :6379   │
               └─────────┘  └──────────┘
```

### Backend Stack

| Component | Technology | Version | Status |
|-----------|-----------|---------|--------|
| Web Framework | FastAPI | 0.109.2 | ✅ Production-ready |
| ORM | SQLAlchemy (async) | 2.0.25 | ✅ |
| DB Driver | asyncpg | 0.29.0 | ✅ |
| Migrations | Alembic | 1.13.1 | ⚠️ No migration files found |
| Cache | Redis | 5.0.1 (client) | ✅ Connected but underutilized |
| Auth | python-jose + passlib | 3.3.0 / 1.7.4 | ✅ JWT-based |
| AI | OpenAI SDK (ZhipuAI) | ≥1.0.0 | ✅ Multi-agent pipeline |
| STT | openai-whisper | ≥20231117 | ⚠️ Optional, needs ffmpeg |

### Frontend Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js (App Router) | 15.1.0 |
| UI Library | React | 19.0.0 |
| Language | TypeScript | 5.6.0 |
| CSS | Tailwind CSS | 3.4.0 |
| State | Zustand + React Query | 5.0.0 / 5.60.0 |
| Charts | Chart.js + react-chartjs-2 | 4.5.1 / 5.3.1 |
| DB Client | Supabase JS | 2.93.2 |

### Key Files

| File | Purpose |
|------|---------|
| `backend/app/main.py` | FastAPI app entry, CORS, lifespan |
| `backend/app/config.py` | Pydantic settings (env vars) |
| `backend/app/database.py` | SQLAlchemy engine + session factory |
| `backend/app/api/v1/router.py` | Route registration (14 routers) |
| `frontend/app/layout.tsx` | Root layout |
| `frontend/lib/api.ts` | API client (27KB — monolithic fetch wrapper) |
| `frontend/lib/auth.tsx` | Auth context & JWT handling |
| `docker-compose.yml` | Local dev: PostgreSQL + Redis + Backend + Frontend |

---

## 2. Code Audit & Technical Debt

### ✅ Critical Issues (RESOLVED 2026-02-21)

#### 2.1 ~~Third-party repos dumped into the project~~ → DELETED
`MobileAgent-main/` (984 files), `Open-AutoGLM-main/` (56 files), `UI-TARS-main/` (22 files) have been removed. ~140MB of research repos purged.

#### 2.2 ~~Legacy application still in tree~~ → DELETED
`legacy-synapse-os/` (old Vite/React SPA) has been removed.

#### 2.3 ~~Root-level file sprawl~~ → ORGANIZED
Assets moved to proper directories:
- `assets/fonts/myfont.ttf`
- `assets/images/logo.png`, `synapseoslogo.png`, `profile.jpeg`
- `docs/marketing/description-page-AD.html`
- Obsolete docs (`DEVELOPMENT.md`, `FEATURE_UPDATE.md`) deleted
- Empty `icon_url/` deleted

#### 2.4 ~~Minimal .gitignore~~ → FIXED
Comprehensive `.gitignore` now covers Python, Node, env files, build artifacts, OS files, IDE configs.

### 🟡 Medium Issues

#### 2.5 Test coverage near zero
Only 1 test file exists: `backend/tests/test_task_decomposer.py`. No tests for:
- API endpoints
- Auth flows
- Database operations
- Frontend (no Jest/Vitest/Playwright)

#### 2.6 No database migrations
Alembic is in `requirements.txt` but no `alembic/` directory or migration files exist. The app uses `Base.metadata.create_all()` at startup — acceptable for prototyping, fatal for production schema evolution.

#### 2.7 Dual database strategy confusion
Both Supabase (frontend direct access via `@supabase/supabase-js`) and FastAPI/SQLAlchemy (backend) can access the database. This creates:
- Race conditions on writes
- Inconsistent auth models
- Schema drift between `supabase/schema.sql` and SQLAlchemy models

**Decision needed:** Single source of truth for data access — backend API only (recommended for production).

#### 2.8 Monolithic API client (`frontend/lib/api.ts` — 27KB)
Contains all API calls in a single file. Should be split by domain (orders, menu, payments, etc.).

#### 2.9 No CI/CD pipeline
No GitHub Actions, no linting enforcement, no automated testing.

### 🟢 Low Priority

- No logging infrastructure (only `print()` statements)
- No rate limiting implementation
- No API versioning beyond URL prefix `/api/v1`
- `docker-compose.yml` exposes dev passwords

---

## 3. Feature Implementation Status

### Fully Functional Features

These modules have complete backend API + frontend UI and can handle real traffic:

1. **POS System** — Order creation, cart, split checks, course management, tip calc
2. **Menu Management** — CRUD for categories, items, modifiers with pricing
3. **Order Management** — Full lifecycle: pending → preparing → ready → completed
4. **Table Management** — Visual layout, status tracking, QR code generation
5. **KDS** — Real-time order display via WebSocket, status updates, timers
6. **Reservations** — Booking creation, waitlist queue, seat assignment
7. **QR Code Ordering** — Mobile-optimized guest self-ordering flow
8. **Self-Order Kiosk** — Touch-optimized, bilingual, auto-idle reset
9. **Pickup Display** — Large-screen order status with animations
10. **Staff Management** — CRUD, role assignment
11. **Inventory** — Stock items, transactions, reorder points
12. **Reports** — Revenue, item sales, trends
13. **Robot Control** — G-Code generation, status monitoring, task queue
14. **AI Multi-Agent** — Task decomposition, multi-agent coordination, Whisper STT

### Data Model Exists, No Live Integration

These modules have SQLAlchemy models and sometimes API stubs, but **no real external service integration**:

1. **Payment Processing** — `payment.py` model exists, Stripe/Square API not connected
2. **Loyalty Program** — Full model + API, but frontend UI is incomplete
3. **Multi-Location** — Organization/Location models, no API endpoints implemented
4. **Review Management** — Review model + AI reply generation, no Google/Yelp API
5. **SMS Marketing** — Campaign/Log models, no Twilio/SMS provider connected
6. **Scheduling** — Shift models exist, optimization algorithm not implemented
7. **AI Recommendations** — Basic recommendation service, no ML model

---

## 4. Unimplemented Interfaces (留空接口)

> **The following API endpoints are declared or documented but NOT connected to any real service. They will return errors or empty responses.**

### Payment Gateway

| Endpoint | File | Status |
|----------|------|--------|
| `POST /payments/stripe/create-payment-intent` | `api/v1/payments.py` | ❌ Stub — no Stripe SDK |
| `POST /payments/stripe/webhook` | `api/v1/payments.py` | ❌ Stub |
| `POST /payments/refund` | `api/v1/payments.py` | ❌ Stub |

### SMS/Email Notifications

| Endpoint | File | Status |
|----------|------|--------|
| SMS send | `models/review.py` (SMSCampaign/SMSLog models only) | ❌ No Twilio SDK |
| Email notifications | Not implemented anywhere | ❌ No SendGrid/SES |

### Multi-Location Management

| Endpoint | File | Status |
|----------|------|--------|
| Organization CRUD | `models/organization.py` (model only) | ❌ No API routes |
| Location CRUD | Same | ❌ No API routes |
| Cross-location transfer | Same | ❌ No API routes |

### Computer Vision / Inventory Monitoring

| Component | Status |
|-----------|--------|
| Camera driver integration | ❌ Not started |
| Object detection model (YOLO/OpenCV) | ❌ Not started |
| Real-time inventory deduction | ❌ Not started |
| Circuit breaker (over-sell prevention) | ❌ Not started |

### AI Features (Planned Provider: MiniMax API)

| Component | Current Status | Planned |
|-----------|---------------|---------|
| LLM Provider | ZhipuAI GLM-4 | → MiniMax API (留空, 待对接) |
| AI Chat UI | No frontend | → Frontend chat component needed |
| Conversation history | Not persisted | → Database storage needed |
| Voice input | Whisper works but no UI | → Frontend mic component needed |
| Smart recommendations | Basic logic only | → ML pipeline with MiniMax |

---

## 5. Commercial Tech Stack Roadmap

### Target Architecture (v2.0)

Based on competitive analysis of Toast, Chowbus, and MenuSifu, here is the recommended commercial-grade tech stack:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                     │
├───────────────┬───────────────┬───────────┬──────────────┬──────────────┤
│  Android POS  │  Web Admin    │ Mobile App│  Kiosk/KDS   │ Pickup Screen│
│  (Kotlin)     │  (Next.js)    │ (Flutter) │  (React)     │  (React)     │
└───────┬───────┴───────┬───────┴─────┬─────┴──────┬───────┴──────┬───────┘
        │               │             │            │              │
        └───────────────┴─────────────┴────────────┴──────────────┘
                                    │
                          ┌─────────▼──────────┐
                          │   Azure API Mgmt   │
                          │   (API Gateway)    │
                          └─────────┬──────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼───────┐  ┌────────────────▼────────────┐  ┌──────────▼──────────┐
│  Go Services  │  │   Rust Services              │  │  C++ Services       │
│               │  │                              │  │                     │
│ • Order API   │  │ • Payment Engine             │  │ • Robot Controller  │
│ • Menu API    │  │ • Real-time Event Bus        │  │   (G-Code pipeline) │
│ • Auth/IAM    │  │ • Analytics Pipeline         │  │ • CV/Vision Engine  │
│ • Table Mgmt  │  │ • WebSocket Gateway          │  │   (OpenCV + YOLO)   │
│ • Staff API   │  │                              │  │ • Taste Engine      │
│ • Report API  │  │                              │  │   (C2M computation) │
│               │  │                              │  │                     │
└───────┬───────┘  └──────────────┬───────────────┘  └──────────┬──────────┘
        │                         │                             │
        └─────────────────────────┼─────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────────┐
        │                         │                             │
┌───────▼───────┐  ┌──────────────▼───────────┐  ┌─────────────▼──────────┐
│  PostgreSQL   │  │   Redis                  │  │   Azure Blob Storage   │
│  (Azure DB)   │  │   (Azure Cache)          │  │   (Images, G-Code)     │
│               │  │   + Azure Service Bus    │  │                        │
└───────────────┘  └──────────────────────────┘  └────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   AI Service (Python)       │
                    │   • MiniMax API Client      │
                    │   • Whisper STT             │
                    │   • Multi-Agent Coordinator │
                    │   • Recommendation Engine   │
                    └─────────────────────────────┘
```

### Language / Service Mapping

| Service Domain | Language | Rationale |
|---------------|----------|-----------|
| **Core Business APIs** (Order, Menu, Table, Staff, Auth, Report, Reservation, Loyalty, Inventory) | **Go** | High concurrency, fast startup, excellent for microservices. Industry-proven (Uber, Cloudflare). Simple deployment as static binaries. |
| **Payment Engine** | **Rust** | Memory safety for financial transactions, zero-cost abstractions, prevents common security vulnerabilities. PCI-DSS compliance demands this level of rigor. |
| **Real-time Event Bus** (WebSocket gateway, order status, KDS events) | **Rust** | Tokio async runtime handles massive concurrent WebSocket connections efficiently. Sub-ms latency for kitchen display real-time updates. |
| **Analytics Pipeline** | **Rust** | High-throughput data processing for sales analytics, trend computation. |
| **Robot Controller** (G-Code generation, machine communication) | **C++** | Direct hardware communication, real-time control loops, integrates with existing robot firmware (typically C/C++). Subms timing requirements for oil temperature, stir-fry control. |
| **Computer Vision Engine** (inventory monitoring, food recognition) | **C++** | OpenCV and YOLO inference run natively in C++. CUDA/TensorRT GPU acceleration for real-time object detection. |
| **Taste C2M Engine** (per-user flavor computation) | **C++** | Numerical computation-intensive taste profile matching, spice level computation, and recipe parameter optimization. |
| **AI/ML Services** (LLM integration, recommendations, STT) | **Python** | Richest ML ecosystem (PyTorch, HuggingFace, OpenAI SDK). MiniMax API client. Acceptable latency for non-real-time AI tasks. |
| **Admin Dashboard** | **Next.js (TypeScript)** | Keep current stack — SSR, React ecosystem, existing UI. |
| **Android POS Terminal** | **Kotlin** | Industry standard (Toast uses Kotlin). Deep Android integration for peripheral hardware (receipt printer, cash drawer, card reader). |
| **Customer Mobile App** | **Flutter (Dart)** | Single codebase for iOS + Android. Rich UI toolkit. Cost-effective for a startup. |

### Why Not Pure Python/Node.js?

| Concern | Python/Node.js | Our Stack |
|---------|---------------|-----------|
| Concurrent connections | GIL limits true parallelism / callback hell | Go goroutines (1M+ concurrent), Rust tokio |
| Payment security | Dynamic typing = more runtime errors | Rust's compiler catches memory/type errors at build time |
| Robot latency | ~10-50ms Python overhead | C++ <1ms deterministic control loops |
| CV inference | Python wrapper adds overhead | C++ native CUDA/TensorRT, 10x throughput |
| Cold start (containers) | 2-5s Python/Node | Go: <100ms, Rust: <50ms |
| Memory footprint | 50-200MB per process | Go: 10-30MB, Rust: 5-15MB, C++: 3-10MB |

---

## 6. Service Architecture (Target)

### Microservice Boundaries

```
synapse-os/
├── services/
│   ├── gateway/              # Go — API Gateway + Auth middleware
│   ├── order-service/        # Go — Order lifecycle
│   ├── menu-service/         # Go — Menu CRUD
│   ├── table-service/        # Go — Table management
│   ├── staff-service/        # Go — Staff & scheduling
│   ├── inventory-service/    # Go — Stock tracking
│   ├── report-service/       # Go — Analytics aggregation
│   ├── reservation-service/  # Go — Booking & waitlist
│   ├── loyalty-service/      # Go — Points, tiers, rewards
│   ├── payment-engine/       # Rust — Payment processing (Stripe/Square)
│   ├── event-bus/            # Rust — WebSocket + message broker
│   ├── analytics-pipeline/   # Rust — Data processing
│   ├── robot-controller/     # C++ — G-Code & machine control
│   ├── vision-engine/        # C++ — OpenCV/YOLO inventory monitoring
│   ├── taste-engine/         # C++ — C2M flavor computation
│   └── ai-service/           # Python — LLM, STT, recommendations
│
├── clients/
│   ├── web-admin/            # Next.js — Admin dashboard
│   ├── android-pos/          # Kotlin — POS terminal
│   ├── mobile-app/           # Flutter — Customer app
│   ├── kiosk/                # React — Self-order kiosk
│   └── pickup-display/       # React — Kitchen pickup screen
│
├── infra/
│   ├── terraform/            # Azure IaC
│   ├── k8s/                  # Kubernetes manifests
│   ├── docker/               # Dockerfiles per service
│   └── ci/                   # GitHub Actions workflows
│
├── proto/                    # gRPC protobuf definitions (inter-service comm)
├── shared/                   # Shared types, constants
└── docs/                     # Architecture docs, ADRs
```

### Inter-Service Communication

| Communication | Technology | Use Case |
|--------------|-----------|----------|
| Client → Gateway | HTTPS + REST (JSON) | All client requests |
| Gateway → Go services | gRPC (Protobuf) | Internal service calls, type-safe, fast |
| Services → Event Bus | Azure Service Bus / Redis Streams | Async events (order created, payment completed) |
| Event Bus → Clients | WebSocket (Rust gateway) | Real-time updates to KDS, pickup screen |
| AI Service → Go services | REST (JSON) | AI responses back to business logic |
| Robot Controller ↔ Hardware | TCP/Serial + G-Code | Direct machine communication |
| Vision Engine → Inventory | gRPC | Stock deduction events |

---

## 7. Database Migration Plan

### Phase 1: Clean up current PostgreSQL schema

```sql
-- Current: 20+ tables defined via SQLAlchemy models
-- Issues:
--   1. Supabase schema.sql is out of sync with SQLAlchemy models
--   2. No Alembic migration history
--   3. RLS policies are all "allow everything" (dev-only)

-- Action: Initialize Alembic, generate baseline migration from current models
```

### Phase 2: Azure Database for PostgreSQL

| Config | Value |
|--------|-------|
| Service | Azure Database for PostgreSQL - Flexible Server |
| Version | PostgreSQL 16 |
| Tier | General Purpose (D2ds_v5) → scale as needed |
| HA | Zone-redundant HA |
| Backup | Automated, 35-day retention |
| Network | Private endpoint within Azure VNet |

### Phase 3: Schema per service (eventual)

When migrating to microservices, each Go service owns its own DB schema:

| Service | Schema | Key Tables |
|---------|--------|-----------|
| order-service | `orders` | orders, order_items |
| menu-service | `menus` | menu_categories, menu_items, modifiers |
| table-service | `tables` | tables, reservations, waitlist |
| payment-engine | `payments` | payments, refunds, cash_drawers |
| loyalty-service | `loyalty` | customer_loyalty, points, rewards |
| staff-service | `staff` | staff, schedules |
| inventory-service | `inventory` | inventory_items, transactions |
| report-service | Read replicas | Aggregated views |

---

## 8. Infrastructure (Azure)

### Core Azure Services

| Service | Purpose | Tier |
|---------|---------|------|
| **AKS** (Azure Kubernetes Service) | Container orchestration | Standard |
| **Azure Database for PostgreSQL** | Primary database | Flexible Server |
| **Azure Cache for Redis** | Session cache, pub/sub | Premium (for persistence) |
| **Azure Service Bus** | Async messaging between services | Standard |
| **Azure Blob Storage** | Images, G-Code files, uploads | Hot tier |
| **Azure CDN** | Static asset delivery | Standard |
| **Azure API Management** | API Gateway, rate limiting, auth | Developer → Standard |
| **Azure Container Registry** | Docker image storage | Basic |
| **Azure Monitor + Log Analytics** | Centralized logging, APM | Pay-as-you-go |
| **Azure Application Insights** | Frontend + backend telemetry | Standard |
| **Azure Key Vault** | Secret management | Standard |

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml (conceptual)
triggers: push to main / PR
steps:
  1. Lint (golangci-lint, clippy, clang-tidy, eslint)
  2. Test (go test, cargo test, ctest, jest)
  3. Build Docker images per service
  4. Push to Azure Container Registry
  5. Deploy to AKS (staging)
  6. Run integration tests
  7. Manual approval → Deploy to AKS (production)
```

### Monitoring Stack

| Tool | Purpose |
|------|---------|
| Azure Monitor | Infrastructure metrics |
| Application Insights | APM, distributed tracing |
| Grafana (Azure Managed) | Custom dashboards |
| Azure Alerts | PagerDuty/Slack notifications |

---

## 9. Development Workflow

### Branch Strategy

```
main          ← production-ready, protected
├── develop   ← integration branch
│   ├── feature/SOE-123-payment-integration
│   ├── feature/SOE-124-mobile-app
│   └── fix/SOE-125-order-race-condition
└── release/v2.0.0  ← release candidate
```

### Running Locally

```bash
# Full stack via Docker
docker-compose up -d

# Backend only (hot reload)
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend only (hot reload)
cd frontend
npm run dev

# Backend API docs
open http://localhost:8000/docs
```

### Adding a New API Endpoint

1. Create model in `backend/app/models/<domain>.py`
2. Create schema in `backend/app/schemas/<domain>.py`
3. Create router in `backend/app/api/v1/<domain>.py`
4. Register in `backend/app/api/v1/router.py`
5. Import model in `backend/app/models/__init__.py`
6. Generate migration: `alembic revision --autogenerate -m "description"`
7. Apply migration: `alembic upgrade head`
8. Write tests in `backend/tests/test_<domain>.py`

### Code Style

| Language | Formatter | Linter |
|----------|-----------|--------|
| Python | Black + isort | Ruff |
| TypeScript | Prettier | ESLint |
| Go (future) | gofmt | golangci-lint |
| Rust (future) | rustfmt | clippy |
| C++ (future) | clang-format | clang-tidy |

---

## 10. Security Checklist

### 🔴 Must Fix Before Production

- [ ] Change `SECRET_KEY` from `dev-secret-key-change-in-production`
- [ ] Remove hardcoded passwords from `docker-compose.yml`
- [ ] Implement proper Supabase RLS policies (currently `USING (true)`)
- [ ] Add rate limiting to all API endpoints
- [ ] Add HTTPS enforcement
- [ ] Implement CSRF protection
- [ ] Audit all SQL for injection vulnerabilities
- [ ] Add request input sanitization
- [ ] Remove or protect `/docs` and `/redoc` in production

### 🟡 Should Do

- [ ] Implement API key rotation strategy
- [ ] Add audit logging for all data mutations
- [ ] Set up Azure Key Vault for secret management
- [ ] Implement OAuth 2.0 for third-party integrations
- [ ] Add Content Security Policy headers
- [ ] PCI-DSS compliance review for payment module

---

## Appendix: Cleanup Log

**Date:** 2026-02-21  
**Executed by:** Project Lead

| Action | Status |
|--------|--------|
| Delete `MobileAgent-main/`, `Open-AutoGLM-main/`, `UI-TARS-main/` | ✅ Done |
| Delete `legacy-synapse-os/` | ✅ Done |
| Delete `DEVELOPMENT.md`, `FEATURE_UPDATE.md` | ✅ Done |
| Move assets to `assets/fonts/`, `assets/images/` | ✅ Done |
| Move marketing page to `docs/marketing/` | ✅ Done |
| Delete `icon_url/`, `frontend/.next.bak/` | ✅ Done |
| Rewrite `.gitignore` (comprehensive) | ✅ Done |
| Replace `README.md` with clean version | ✅ Done |
| Initialize Alembic migrations | 🔲 Pending (next phase) |

**Files removed:** ~1,100+  
**Repo size reduced:** ~140MB+

---

## Appendix B: 微服务骨架实现状态 (Monorepo Scaffold)

**Date:** 2026-02-21  
**搭建者:** Project Lead

> 以下表格列出了每个微服务的文件及其实现状态。  
> ✅ = 框架已搭建 (可编译/运行)  |  🔲 = 接口已定义，业务逻辑待实现  |  ❌ = 尚未创建

### Go 服务 (9 个核心业务 + 1 网关)

| 服务 | 文件 | 状态 | 负责团队 |
|------|------|------|---------|
| **gateway** | `services/gateway/cmd/main.go` | ✅ 路由表完整 | 通用 |
| | `internal/config/config.go` | ✅ 15+ 服务地址配置 | 通用 |
| | `internal/middleware/auth.go` | ✅ JWT 认证中间件 | 通用 |
| | `internal/middleware/middleware.go` | ✅ CORS, Logger, RequestID; 🔲 RateLimiter | 通用 |
| | `internal/handler/handler.go` | ✅ 框架; 🔲 所有 ProxyTo* 方法 | 通用 |
| | `Dockerfile` | ✅ 多阶段构建 | 通用 |
| **order-service** | `cmd/main.go` | ✅ gRPC 服务器启动 | 通用 |
| | `internal/handler/handler.go` | ✅ 框架; 🔲 CRUD + SplitCheck | 通用 |
| | `internal/config/config.go` | ✅ | 通用 |
| **menu-service** | `cmd/main.go` | ✅ gRPC 骨架 | 通用 |
| **table-service** | `cmd/main.go` | ✅ gRPC 骨架 | 通用 |
| **staff-service** | `cmd/main.go` | ✅ gRPC 骨架 | 通用 |
| **inventory-service** | `cmd/main.go` | ✅ gRPC 骨架; 🔲 与 vision-engine 联动 | 通用 + 中国团队 |
| **report-service** | `cmd/main.go` | ✅ gRPC 骨架 | 通用 |
| **reservation-service** | `cmd/main.go` | ✅ gRPC 骨架 | 通用 |
| **loyalty-service** | `cmd/main.go` | ✅ gRPC 骨架 | 通用 |

### Rust 服务 (Cargo Workspace)

| 服务 | 文件 | 状态 | 负责团队 |
|------|------|------|---------|
| **payment-engine** | `src/main.rs` | ✅ Tokio 异步框架 | 通用 |
| | `src/payment.rs` | ✅ 类型定义 + PaymentProcessor trait; 🔲 Stripe 实现 | 通用 |
| | `src/config.rs` | ✅ | 通用 |
| | `Cargo.toml` | ✅ | 通用 |
| **event-bus** | `src/main.rs` | ✅ 骨架; 🔲 WebSocket 管理 + 事件路由 | 通用 |
| **analytics-pipeline** | `src/main.rs` | ✅ 骨架; 🔲 全部待实现 | 通用 |

### C++ 服务 (📌 中国团队重点)

| 服务 | 文件 | 状态 | 负责团队 |
|------|------|------|---------|
| **robot-controller** | `CMakeLists.txt` | ✅ 完整构建配置 | 🇨🇳 中国硬件团队 |
| | `src/main.cpp` | ✅ 入口 + G-Code 演示 | 🇨🇳 |
| | `include/.../gcode_generator.h` | ✅ 完整 API (stir_fry, add_ingredient, plate, clean, adjust_for_taste) | 🇨🇳 |
| | `src/gcode_generator.cpp` | ✅ stir_fry 基础实现; 🔲 其余方法 | 🇨🇳 |
| | `include/.../robot_controller.h` | ✅ 完整控制器 API (connect, send_gcode, emergency_stop, telemetry) | 🇨🇳 |
| | `src/robot_controller.cpp` | 🔲 全部待实现 (占位) | 🇨🇳 |
| | `include/.../serial_comm.h` | ✅ 串口通信接口 | 🇨🇳 |
| | `src/serial_comm.cpp` | 🔲 全部待实现 (占位) | 🇨🇳 |
| **vision-engine** | `src/main.cpp` | ✅ 骨架; 🔲 全部待实现 | 🇨🇳 中国 AI 团队 |
| **taste-engine** | `src/main.cpp` | ✅ 骨架; 🔲 全部待实现 | 🇨🇳 中国算法团队 |

### Python AI 服务

| 文件 | 状态 | 负责团队 |
|------|------|---------|
| `app/main.py` | ✅ FastAPI 框架 + 4 个 API 端点定义; 🔲 全部业务逻辑待迁移 | 通用 |
| `requirements.txt` | ✅ | 通用 |

### gRPC Proto 定义

| 文件 | 状态 |
|------|------|
| `proto/synapse/v1/common.proto` | ✅ 分页、金额、时间戳、操作结果 |
| `proto/synapse/v1/order.proto` | ✅ OrderService 完整 RPC 定义 (6 个方法) |
| `proto/synapse/v1/robot.proto` | ✅ RobotControllerService (5 个方法含 Stream) |
| `proto/synapse/v1/payment.proto` | ✅ PaymentService (4 个方法) |
| `proto/synapse/v1/menu.proto` | 🔲 待创建 |
| `proto/synapse/v1/table.proto` | 🔲 待创建 |
| `proto/synapse/v1/event.proto` | 🔲 待创建 |

### 基础设施

| 文件 | 状态 |
|------|------|
| `infra/terraform/main.tf` | ✅ AKS + PostgreSQL + Redis + ACR + Key Vault |
| `infra/k8s/base/deployment.yaml` | ✅ Gateway, Order, Payment, Robot K8s 清单 |
| `.github/workflows/ci.yml` | ✅ Go/Rust/C++/Python/Frontend CI + AKS 部署 |

---

*This document is the single source of truth for Synapse OS engineering. Update it as the architecture evolves.*

