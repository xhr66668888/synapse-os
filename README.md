# Synapse OS

> AI-Powered Restaurant Operating System — 下一代 AI 驱动餐饮操作系统

---

## What is Synapse OS?

**Synapse OS** is a full-stack SaaS platform purpose-built for modern restaurant operations. It unifies point-of-sale, kitchen management, customer engagement, and robotic cooking control into a single system — differentiated by deep AI integration and cooking-robot automation that no competitor offers.

**Product tiers:**

| Tier | Codename | Description |
|------|----------|-------------|
| **Gold** | The Brain | Full C2M personalization engine — per-user taste profiles, dynamic menus |
| **Standard** | The Hand | Robot cooking automation — G-Code control, vision-based inventory |
| **Lite** | The Eye | Software-only SaaS POS — no robot hardware required |
| **Care** | The Shield | Accessibility mode — haptic/vibration UI for hearing-impaired staff |

---

## Tech Stack (Current v0.9)

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.11 · FastAPI 0.109 · SQLAlchemy 2.0 (async) · Pydantic v2 |
| **Frontend** | Next.js 15 · React 19 · TypeScript · Tailwind CSS 3.4 · Zustand · React Query |
| **Database** | PostgreSQL 14+ (via asyncpg) · Redis 7 (cache/pubsub) |
| **AI** | OpenAI-compatible SDK (ZhipuAI GLM-4) · Whisper (speech-to-text) |
| **Infra** | Docker Compose (dev) · Terraform + Azure AKS (prod) |
| **Robot** | C++ G-Code pipeline → serial/TCP → cooking robot |

---

## Repository Structure

```
synapse-os/
├── services/                   # ⬅ NEW: Microservice monorepo
│   ├── gateway/                # Go — API Gateway + Auth (Gin)
│   ├── order-service/          # Go — Order lifecycle (gRPC)
│   ├── menu-service/           # Go — Menu CRUD
│   ├── table-service/          # Go — Table management
│   ├── staff-service/          # Go — Staff & scheduling
│   ├── inventory-service/      # Go — Stock tracking
│   ├── report-service/         # Go — Analytics
│   ├── reservation-service/    # Go — Booking & waitlist
│   ├── loyalty-service/        # Go — Points & rewards
│   ├── payment-engine/         # Rust — Payment (Stripe/Square)
│   ├── event-bus/              # Rust — WebSocket + event routing
│   ├── analytics-pipeline/     # Rust — Data processing
│   ├── robot-controller/       # C++ — 🤖 G-Code & machine control (中国团队)
│   ├── vision-engine/          # C++ — 👁️ CV inventory (中国团队)
│   ├── taste-engine/           # C++ — 🧂 C2M taste engine (中国团队)
│   └── ai-service/             # Python — LLM, STT, recommendations
│
├── proto/synapse/v1/           # gRPC Protobuf definitions
│   ├── common.proto            # Shared types (pagination, money)
│   ├── order.proto             # OrderService (6 RPCs)
│   ├── robot.proto             # RobotControllerService (5 RPCs)
│   └── payment.proto           # PaymentService (4 RPCs)
│
├── backend/                    # Python/FastAPI (legacy, migrating to Go)
├── frontend/                   # Next.js 15 (admin + customer UI)
│
├── infra/                      # Infrastructure as Code
│   ├── terraform/              # Azure resources (AKS, PostgreSQL, Redis)
│   ├── k8s/                    # Kubernetes manifests
│   └── docker/                 # Per-service Dockerfiles
│
├── .github/workflows/ci.yml   # CI/CD (Go/Rust/C++/Python/Frontend)
├── assets/                     # Brand fonts & images
├── docs/                       # Marketing materials
├── Cargo.toml                  # Rust workspace root
├── docker-compose.yml          # Local dev orchestration
├── ENGINEERING.md              # ← ENGINEERING MAINTENANCE GUIDE
└── README.md                   # ← YOU ARE HERE
```

> **Note:** The `backend/` Python/FastAPI server is the current working system (v0.9). Business logic is being progressively migrated to the Go/Rust/C++ services in `services/`. See `ENGINEERING.md` Appendix B for per-file implementation status.

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (recommended)
- PostgreSQL 14+ (or use SQLite for local dev)
- Redis 7+ (optional for local dev)

### Option A: Docker (Recommended)

```bash
git clone https://github.com/your-org/synapse-os.git
cd synapse-os
docker-compose up -d

# Backend API:  http://localhost:8000
# API Docs:     http://localhost:8000/docs
# Frontend:     http://localhost:3000
```

### Option B: Manual Setup

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit database credentials
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
cp .env.local.example .env.local  # Edit API URL
npm run dev
```

---

## Feature Status Matrix

### ✅ Implemented & Functional

| Module | Backend | Frontend | Notes |
|--------|---------|----------|-------|
| POS System | ✅ Full CRUD | ✅ Full UI | Split checks, course management, tips |
| Menu Management | ✅ | ✅ | Categories, items, modifiers |
| Order Management | ✅ | ✅ | All order types, status tracking |
| Table Management | ✅ | ✅ | Visual layout, QR code generation |
| KDS (Kitchen Display) | ✅ | ✅ | WebSocket real-time, timers |
| Reservations | ✅ | ✅ | Booking + waitlist queue |
| Staff Management | ✅ | ✅ | Roles, schedules |
| Inventory | ✅ | ✅ | Stock tracking, transactions |
| Reports / Analytics | ✅ | ✅ | Revenue, sales, trends |
| QR Code Ordering | ✅ | ✅ | Mobile-optimized guest ordering |
| Kiosk (Self-Order) | ✅ | ✅ | Touch-friendly, auto-reset |
| Pickup Screen | ✅ | ✅ | Large display, animations |
| Robot Cooking Control | ✅ API | ✅ UI | G-Code generation, status monitoring |
| AI Customer Service | ✅ Multi-agent | ⚠️ No chat UI | Task decomposition, Whisper STT |
| Loyalty Program | ✅ Full | ⚠️ Partial UI | 5-tier system, points, rewards |

### ⚠️ Data Model Only (API Stubs — No Live Integration)

| Module | What Exists | What's Missing |
|--------|------------|----------------|
| **Payment Processing** | DB models, API stubs | Stripe/Square API integration |
| **SMS Marketing** | Campaign/log models | Twilio/cloud SMS provider |
| **Multi-Location Mgmt** | Organization/Location models | Full REST API endpoints |
| **Review Aggregation** | Review models, AI reply logic | Google/Yelp API connectors |
| **Visual Inventory (CV)** | Conceptual design | OpenCV/YOLO model, camera driver |
| **Scheduling Optimization** | Shift models | Optimization algorithm |
| **AI Recommendations** | Basic logic | ML model training pipeline |

### ❌ Not Started

| Module | Priority |
|--------|----------|
| Mobile App (iOS/Android) | 🔴 High |
| Offline-First / Local DB Sync | 🔴 High |
| Brand Marketing Website | 🟡 Medium |
| Gift Card System | 🟡 Medium |
| Accounting Integration (QuickBooks) | 🟢 Low |
| Supply Chain Management | 🟢 Low |

---

## API Overview

Base URL: `http://localhost:8000/api/v1`

| Prefix | Tag | Description |
|--------|-----|-------------|
| `/auth` | 认证 | Login, register, JWT tokens |
| `/menu` | 菜单 | Menu categories & items |
| `/modifiers` | 修饰符 | Menu item modifiers |
| `/orders` | 订单 | Order lifecycle management |
| `/payments` | 支付 | Payment records (stub) |
| `/inventory` | 库存 | Stock tracking |
| `/schedule` | 排班 | Staff scheduling |
| `/reports` | 报表 | Business analytics |
| `/tables` | 桌位 | Table & QR code management |
| `/staff` | 员工 | Staff CRUD |
| `/robot` | 机器人 | Robot cooking control |
| `/reservations` | 预订 | Reservations & waitlist |
| `/loyalty` | 忠诚度 | Loyalty program & rewards |
| `/agent/*` | AI Agent | Multi-agent AI services |

Interactive API docs: `http://localhost:8000/docs` (Swagger UI)

---

## Environment Variables

See `backend/.env.example` and `frontend/.env.local.example` for complete reference.

**Critical backend vars:**

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL async connection string |
| `SECRET_KEY` | Yes | JWT signing key (change in production!) |
| `REDIS_URL` | No | Redis connection (defaults to localhost) |
| `ZHIPU_API_KEY` | For AI | ZhipuAI API key |
| `STRIPE_SECRET_KEY` | Future | Stripe payment integration |
| `TWILIO_ACCOUNT_SID` | Future | SMS notifications |

---

## License

Proprietary — All rights reserved. © 2026 PanShaker Services.
