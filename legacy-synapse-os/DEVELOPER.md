# Synapse OS 开发者文档 (SDE Guide)

## 🏗️ 项目架构

Synapse OS 是一个基于 React + Vite 的单页应用 (SPA)，采用了模块化、组件化的架构设计。项目旨在提供高内聚、低耦合的餐饮管理解决方案。

### 技术栈 (Tech Stack)

- **核心框架**: React 18
- **构建工具**: Vite
- **语言**: TypeScript
- **路由**: React Router v6
- **样式**: CSS Modules + CSS Variables (遵循 FlymeOS 设计规范)
- **图表**: 自研轻量级图表组件 / CSS 实现

---

## 📂 目录结构

```
src/
├── components/        # 公共组件
│   ├── Layout/        # 全局布局 (侧边栏, 导航)
│   ├── MusicPlayer/   # 全局音乐播放器
│   └── NetworkStatus/ # 网络状态检测
├── pages/             # 页面模块 (对应路由)
│   ├── Dashboard/     # 仪表盘 (核心数据概览)
│   ├── POS/           # 点餐系统
│   ├── KDS/           # 厨房显示系统
│   ├── Tables/        # [NEW] 桌位管理
│   ├── Orders/        # [NEW] 订单管理
│   ├── Menu/          # [NEW] 菜单管理
│   ├── Reports/       # [NEW] 报表分析
│   ├── Staff/         # [NEW] 员工管理
│   ├── Customers/     # [NEW] 顾客管理
│   ├── Delivery/      # 外卖平台聚合
│   └── AIReceptionist/# AI 接线员
├── assets/            # 静态资源 (图标, 图片)
├── App.tsx            # 根组件 & 路由配置
└── main.tsx           # 入口文件
```

---

## 🚧 待完成部分 (TODO / Missing Implementation)

本项目目前作为**前端演示系统 (Frontend Demo)** 运行，所有数据均为 mock 数据。以下模块需要接入后端服务或进一步开发：

### 1. 后端集成 (Backend Integration)
- **留空状态**: 目前所有页面（Dashboard, Orders, Tables 等）均使用本地 mock 数据（如 `mockOrders`, `mockStaff`）。
- **待办**:
  - 创建 API Client 层 (Axios/Fetch)。
  - 定义 API 接口类型 (Interfaces)。
  - 替换 `useState` 中的初始数据为 API 调用。
  - 实现 WebSocket 连接以支持订单、桌位状态的实时更新。

### 2. 认证与授权 (Authentication & Authorization)
- **留空状态**: 目前应用没有登录页，默认为管理员权限直接进入。
- **待办**:
  - 实现 `Login` 页面。
  - 集成 JWT 或 Session 认证。
  - 实现基于角色的访问控制 (RBAC)，例如：只有经理可查看报表，服务员仅可操作 POS。

### 3. 国际化 (i18n)
- **留空状态**: 目前全站文案为硬编码的中文。
- **待办**:
  - 引入 `react-i18next` 或类似库。
  - 抽取所有中文字符串至 `locales/zh-CN.json` 和 `locales/en-US.json`。
  - 添加语言切换开关。

### 4. 支付网关集成
- **留空状态**: 结账功能目前仅为 UI 演示。
- **待办**:
  - 集成 Stripe / Square / 微信支付 API。
  - 处理支付回调与退款逻辑。

### 5. 打印服务集成
- **留空状态**: 点击"打印小票"无实际物理操作。
- **待办**:
  - 集成 ESC/POS 指令集。
  - 对接热敏打印机 (网络/蓝牙/USB)。

---

## 🎨 UI/UX 规范

项目遵循 **FlymeOS** 风格指南：
- **色彩**: 白底为主，使用高饱和度强调色。
- **圆角**: 统一使用大圆角 (12px - 20px)。
- **图标**: 必须使用 `/assets/` 下的专业 PNG 图标，**严禁使用 Emoji**。
- **交互**: 强调微交互与平滑过渡。

---

## ⚠️ 开发注意事项

1. **绝对路径**: Import 时尽量使用相对路径或配置别名（目前未配置 alias，需注意）。
2. **状态管理**: 目前主要依靠组件内 State，随着复杂度增加，建议引入 Redux Toolkit 或 Zustand。
3. **性能**: 注意大列表渲染（订单较多时），考虑引入虚拟滚动。

---

此文档旨在帮助 SDE 快速理解项目现状并接手后续开发。
