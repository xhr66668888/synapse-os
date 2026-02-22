# UI 重构迁移记录

## 背景

Synapse OS 前端原采用 Apple/FlymeOS 风格：毛玻璃、大圆角（最大 32px）、pastel 渐变色、`hover:scale` 弹性动效。整体视觉接近一套定制安卓系统 UI，在餐厅实际运营场景下有明显缺陷：

- **状态模糊**：pastel 颜色装饰性强，但"待接单是蓝还是紫"无法在高噪音环境中一眼判断
- **误操作风险高**：圆角大、按钮有弹性反馈，在油手 / 匆忙操作下不如扁平矩形可靠
- **密度不足**：毛玻璃卡片 padding 大，KDS / POS 等高密度终端信息量少
- **声音缺失**：无任何音频交互，KDS 新单无法告知厨师

本次重构目标：**日本餐饮工业级设计风格 —— 色彩即状态、极简高效、状态外显、完整声音交互**。

---

## 设计原则变更

### 语义色系（色彩 = 唯一语义，不得挪作他用）

| Token | 色值 | 唯一含义 |
|-------|------|----------|
| `action` | `#1A1A1A` | 主操作按钮 |
| `success` | `#00A550` | 已完成 / 在架 / 已支付 / 已上菜 |
| `warning` | `#FF8C00` | 处理中 / 待接单 / 制作中 |
| `danger` | `#CC1100` | 报错 / 缺货 / 下架 / 催单 / 取消 |
| `info` | `#005BBB` | 信息提示 / 外卖平台标识 |

删除：所有 `bg-blue-*`、`bg-purple-*`、`bg-orange-*`、`bg-green-100`、`from-primary/10 via-purple-500/10` 等装饰性颜色。

### 圆角（扁平工业风）

| 删除 | 替换 |
|------|------|
| `rounded-xl`（12px） | `rounded-sm`（4px） |
| `rounded-2xl`（16px） | `rounded-md`（6px） |
| `rounded-3xl`（24px） | `rounded-sm`（4px） |
| `rounded-full`（50%） | 仅保留 2px 状态指示点 |

### 动效

删除：`hover:scale-[1.02]`、`hover:-translate-y-1`、`animate-bounce`、`animate-pulse`（业务状态 pulse 除外）、毛玻璃 `backdrop-blur-xl`。

保留：`transition-colors`（颜色切换）、KDS 超时 `kds-blink` 闪烁、静音边缘 `edge-flash` 视觉补偿。

---

## Phase 1：设计 Token 全面替换

**文件：** `frontend/tailwind.config.ts` / `frontend/app/globals.css`

### Tailwind 新增语义色

```ts
colors: {
  action:  { DEFAULT: '#1A1A1A', fg: '#FFFFFF' },
  success: { DEFAULT: '#00A550', fg: '#FFFFFF', bg: 'rgba(0,165,80,0.12)' },
  warning: { DEFAULT: '#FF8C00', fg: '#1A1A1A', bg: 'rgba(255,140,0,0.12)' },
  danger:  { DEFAULT: '#CC1100', fg: '#FFFFFF', bg: 'rgba(204,17,0,0.12)' },
  info:    { DEFAULT: '#005BBB', fg: '#FFFFFF', bg: 'rgba(0,91,187,0.12)' },
  surface: { base:'#F0EFEB', raised:'#FFFFFF', sunken:'#E4E3DF',
             dark:'#1A1A1A', 'dark-2':'#2A2A2A', 'dark-3':'#363636' },
  text:    { primary, secondary, muted, disabled, inverse },
  border:  { DEFAULT, strong, focus, light },
}
borderRadius: { xs:'2px', sm:'4px', md:'6px', lg:'8px' }
fontFamily.mono: ['JetBrains Mono', 'Menlo', monospace]
```

新增动画：`kds-blink`（KDS 超时闪烁）、`edge-flash`（静音时屏幕边缘补偿）。

### globals.css 新建组件类

| 类名 | 说明 |
|------|------|
| `.btn-action` | 黑底白字，44px 高，无阴影 |
| `.btn-action-sm` | 同上，32px 高，密集表格专用 |
| `.btn-danger` | 红底白字 |
| `.btn-success` | 绿底白字 |
| `.btn-ghost` | 透明底 + 深色边框 |
| `.badge-pending` | 琥珀色半透明底 + 琥珀文字 |
| `.badge-preparing` | 同 pending |
| `.badge-ready` | 绿色半透明底 + 绿色文字 |
| `.badge-served` | 灰色半透明底 |
| `.badge-danger` | 实心红底白字 |
| `.card-base` | 白底，6px 圆角，1px 边框，薄阴影 |
| `.card-flat` | 无阴影仅边框 |
| `.card-dark` | KDS 深色底 |
| `.card-urgent` | 红色左边条，用于超时工单 |
| `.input-base` | 标准文本输入框 |
| `.input-numpad` | 64px 高，等宽大字，POS 数字键盘专用 |

删除：`.glass`、`.glass-dark`、`.card`（Apple 风）、`.btn.btn-primary`、`.btn.btn-secondary`，以及所有 `shadow-primary/30` 彩色阴影。

---

## Phase 2：共享组件库

新建目录：`frontend/components/ui/`

| 组件 | 说明 |
|------|------|
| `StateBadge` | **核心**。所有状态统一入口，支持 `pending/preparing/ready/served/completed/cancelled/listed/delisted`，有 sm/md/lg 三尺寸，可选 pulse |
| `PlatformBadge` | 外卖平台实色标签：美团黄黑、饿了么蓝白、DoorDash 红白、Fantuan 绿白等 |
| `DataTable` | 管理后台密集表格：粘性表头、行多选、批量操作栏、排序、列类型（text/number/currency/badge/actions） |
| `NumericKeypad` | POS 常驻数字键盘，3×4 布局，64×64dp 按键，支持 quantity/price/tableNumber 模式 |
| `OrderTicketCard` | KDS 工单卡：订单号、类型徽章、等候时间（超时变色）、菜品列表、特殊备注高亮、底部操作按钮 |
| `MuteButton` | 静音开关，静音时触发 `edge-flash` 视觉补偿 |
| `TouchButton` | C 端大触控按钮，最小 60×60dp |
| `SectionHeader` | 管理页面统一区块标题 + 计数 + 操作插槽 |
| `BulkActionBar` | DataTable 选中后浮现的批量操作栏 |
| `ConfirmModal` | 涉及金钱 / 关键操作的二次确认弹窗，主次按钮距离足够远 |

### 侧边栏重构（`Sidebar.tsx`）

- 背景 `#1A1A1A` 深色（Win95 风格），文字白色
- 激活项：左侧 3px 亮色边条，全宽矩形，0 圆角
- 删除：`backdrop-blur-xl`、`rounded-xl` 导航项、`hover:scale`、Logo 区 `Sparkles` 脉冲动画、白色内嵌用户卡
- 底部新增 `MuteButton`

### 布局路由（`SidebarWrapper.tsx`）

`noSidebarPaths` 扩展为 `/kiosk`、`/qr-order`、`/pickup-screen`（纯全屏 C 端，不显示侧边栏）。POS 和 KDS 保留侧边栏。

---

## Phase 3：声音交互系统

新建：`frontend/lib/audio/`（`AudioManager.ts` + `useAudio.ts` + `index.ts`）

### 四层声音架构

| 层级 | 时长 | 实现 | 场景 |
|------|------|------|------|
| L1 物理反馈 | <100ms | Web Audio 合成（白噪声+带通滤波） | 按钮点击、数字键输入 |
| L2 状态确认 | ~400ms | Web Audio 双振荡器和弦 | 支付成功（上行）、失败（下行） |
| L3 业务通知 | 重复 | 预合成 AudioBuffer 编钟 | KDS 新单、外卖到单 |
| L4 语音指引 | 变长 | Web Speech API | "取餐号 A001"、"您有新订单" |

**约束：**
- 全部使用 `AudioContext`，禁止 HTML5 `<audio>` 标签
- L1/L2 纯合成，无文件依赖
- 同一终端最多 2 个并发音频通道
- 防抖：1 秒内 5 单合并播报

**终端差异化配置：**

| 终端 | 启用 |
|------|------|
| Kiosk（顾客） | L1 + L2 + L4（语音引导），禁 L3 |
| POS（收银） | L1 + L2，禁 L3/L4 |
| KDS（后厨） | 仅 L3，超时升级（15min 琥珀色，30min 红色闪 + 尖锐警报） |
| 管理后台 | L2 + L3 + L4（5s 防抖语音播报） |
| 取餐屏 | L3 + L4（"A001 号请取餐"） |

React Hook：`useAudio()` 提供 `{ playClick, playSuccess, playFailure, playNewOrder, playKDSAlert, speak, isMuted, setMuted }`。

`TerminalProvider` (`frontend/lib/terminal-context.tsx`) 包裹各页面根组件，向 `AudioManager` 传递终端类型以应用差异化配置。

---

## Phase 4：各终端视觉重构

### 4.1 KDS 后厨显示（`KDSContent.tsx`）

- 根元素添加 `data-terminal="kds"`
- 工单列从圆角卡片 → `<OrderTicketCard>`，4px 状态色左边条
- 特殊备注：琥珀色文字 + 2px 琥珀左边条
- 等候时间变色：正常灰 → 15min 琥珀 → 30min 红色 + `kds-blink` 闪烁
- 超时 30min：全屏红色叠加层 + L3 尖锐警报
- 右上角 `MuteButton`
- 删除 `useKDSWebSocket` 中裸 oscillator，改为 `audioManager.playNewOrder()`

### 4.2 POS 收银（`POSContent.tsx`）

- 产品网格：卡片+图片 → **纯文字色块**（名称 + 等宽价格），点击瞬间反色为黑底白字
- 分类标签：扁平矩形，激活态黑底白字
- 购物车侧栏底部常驻 `<NumericKeypad>`
- 收款按钮：100% 宽，56px 高，黑底白字，金额使用 `font-mono tabular-nums`
- 清空按钮：ghost 红字，不再使用 `btn btn-primary`

### 4.3 管理后台

**通用改动（Dashboard / Orders / Menu / Delivery / Staff / Tables）：**
- 所有 `rounded-2xl/3xl` → `rounded-md`（6px）
- 所有 pastel 状态色（`bg-blue-50 text-blue-600` 等）→ `<StateBadge>`
- 所有金额/数字 → `font-mono tabular-nums`
- 所有 `btn btn-primary` → `btn-action`
- 删除所有渐变 header（`from-primary to-primary-dark`）→ 纯色
- 删除所有 `hover:scale`、`hover:-translate-y-1`、`shadow-primary/20`

**MenuContent 特别改动：** 默认视图从卡片网格 → `<DataTable>`，支持批量上架/下架/改价。

**DeliveryContent 特别改动：** 平台徽章换为 `<PlatformBadge>`，新单触发 L4 语音播报。

**StaffContent 特别改动：**
- 角色标签从 `bg-purple-100 text-purple-700` 等 pastel → 语义图标 + 极简文字
- 状态从 `bg-green-50 text-green-600` → `bg-success-bg text-success` / `bg-surface-sunken text-text-disabled`

**TablesContent 特别改动：**
- 桌位状态颜色从 `border-green-400 bg-blue-50` → `border-success / border-warning / border-info / border-border`
- 选中态从 `ring-primary/20 scale-105` → `ring-2 ring-action`
- QR 生成按钮从渐变紫蓝 → `btn-action`
- QR 弹窗从 `rounded-2xl bg-white shadow-2xl` → `rounded-md bg-surface-raised shadow-card`

### 4.4–4.7 C 端终端

**Kiosk（`/kiosk`）：** 纯黑 header，`btn-success` 64px 确认下单，L4 语音播报取餐号，60s 无操作重置，idle 进度条（最后 15s 显示）。

**QR 扫码点餐（`/qr-order/[qrCode]`）：** 深色 header + 桌号大字，底部固定绿色结算条，错误改为行内 banner 而非 `alert()`。

**取餐屏（`/pickup-screen`）：** 纯黑背景，就绪订单 96px 等宽粗体 + 8px 绿色左边条，新就绪触发 L4 语音。

**Expo 出餐协调（`/expo`）：** 4px 绿色/琥珀左边条区分状态，纯绿进度条，`StateBadge` 统一状态展示。

---

## Phase 5：审计与修复

### 语义色审计

对 12 个核心页面执行 grep，验证无残留：

```
bg-blue-* | bg-purple-* | bg-orange-* | bg-green-100
text-blue-* | bg-gradient-to-r | shadow-primary/20
rounded-2xl | rounded-3xl | hover:scale | backdrop-blur
```

结果：grep 退出码 1（零匹配），全部清洁。

### 价格排版审计

所有 `¥` 金额和 `.toFixed(2)` 均确认有 `font-mono tabular-nums`，包括按钮内的金额文字（用 `<span>` 包裹处理）。

### 触控热区

- KDS / POS 次操作按钮：最小 36×36dp
- KDS / POS 主操作按钮：最小 44×44dp
- Kiosk / QR Order 主操作：最小 48×48dp（`<TouchButton>` 60×60dp）

### TypeScript 清理

- 移除 `StaffContent` 中未使用的 `Clock`、`BadgeCheck` 图标
- 移除 `TablesContent` 中未使用的 `UtensilsCrossed`、`Ban`、`Clock` 图标
- 移除 `TablesContent` 中不再引用的 `useQuery`、`api`、`Table as TableType`

---

## 新建文件

```
frontend/lib/terminal-context.tsx
frontend/lib/audio/AudioManager.ts
frontend/lib/audio/useAudio.ts
frontend/lib/audio/index.ts
frontend/components/ui/StateBadge.tsx
frontend/components/ui/PlatformBadge.tsx
frontend/components/ui/DataTable.tsx
frontend/components/ui/NumericKeypad.tsx
frontend/components/ui/OrderTicketCard.tsx
frontend/components/ui/MuteButton.tsx
frontend/components/ui/TouchButton.tsx
frontend/components/ui/SectionHeader.tsx
frontend/components/ui/BulkActionBar.tsx
frontend/components/ui/ConfirmModal.tsx
frontend/components/ui/index.ts
```

## 修改文件

```
frontend/tailwind.config.ts
frontend/app/globals.css
frontend/components/layout/Sidebar.tsx
frontend/components/layout/SidebarWrapper.tsx
frontend/hooks/useKDSWebSocket.ts
frontend/components/kds/KDSContent.tsx
frontend/components/pos/POSContent.tsx
frontend/components/dashboard/DashboardContent.tsx
frontend/components/orders/OrdersContent.tsx
frontend/components/menu/MenuContent.tsx
frontend/components/delivery/DeliveryContent.tsx
frontend/components/staff/StaffContent.tsx
frontend/components/tables/TablesContent.tsx
frontend/app/expo/page.tsx
frontend/app/kiosk/page.tsx
frontend/app/qr-order/[qrCode]/page.tsx
frontend/app/pickup-screen/page.tsx
frontend/components/ui/NetworkStatus.tsx
```

---

## 未纳入本次重构的文件

以下文件保留原样，不在本次迁移范围内：

- `components/ai-assistant/` — AI 助手弹窗（含 backdrop-blur、渐变，为品牌感设计，单独评估）
- `components/ai-receptionist/` — AI 接待组件
- `components/customers/` — 客户 CRM 页面
- `components/reports/` — 报表页面
- `components/settings/` — 设置页面
