# Synapse OS 部署文档

## 📋 系统要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- 现代浏览器 (Chrome/Firefox/Safari/Edge)

## 🚀 快速启动

### 开发环境

```bash
# 克隆项目
git clone <repository-url>
cd synapse-os

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 浏览器访问
# http://localhost:5173/
```

### 生产构建

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 🔧 环境变量配置

创建 `.env` 文件：

```env
# Supabase (可选 - 本地模式无需配置)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 机器人连接 (可选)
VITE_ROBOT_WS_URL=ws://localhost:8080

# 外卖平台 API (可选)
VITE_DOORDASH_API_KEY=your_doordash_key
VITE_UBEREATS_API_KEY=your_ubereats_key
```

## 🏭 生产部署

### 方案 1: 静态托管 (推荐)

构建后的 `dist/` 目录可部署到任何静态托管服务：

- **Vercel**: 一键部署
- **Netlify**: 拖拽上传
- **Cloudflare Pages**: 免费全球 CDN

### 方案 2: Docker

```dockerfile
# Dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# 构建镜像
docker build -t synapse-os .

# 运行容器
docker run -p 80:80 synapse-os
```

### 方案 3: 本地部署 (Synapse Box)

1. 将 `dist/` 复制到 Synapse Box
2. 使用 Nginx 或 Caddy 托管静态文件
3. 配置反向代理连接后端服务

## 📱 硬件集成

### PanShaker 机器人连接

```javascript
// 配置机器人 WebSocket 连接
const robotWs = new WebSocket('ws://192.168.1.100:8080');

robotWs.onopen = () => {
  console.log('🤖 Robot connected');
};

robotWs.onmessage = (event) => {
  const status = JSON.parse(event.data);
  // 处理机器人状态更新
};
```

### 收银打印机

支持 ESC/POS 协议的热敏打印机，通过 USB 或网络连接。

## 🔒 安全建议

1. **使用 HTTPS**: 生产环境必须启用 HTTPS
2. **API 密钥**: 不要在前端暴露敏感密钥
3. **CORS 配置**: 限制允许的来源域名
4. **定期更新**: 及时更新依赖包修复漏洞

## 📊 监控与日志

- 使用浏览器 DevTools 查看控制台日志
- 生产环境建议接入 Sentry 或 LogRocket
- 离线数据存储在 IndexedDB (synapse-os-offline)

## 🆘 故障排除

| 问题 | 解决方案 |
|------|----------|
| 白屏 | 检查浏览器控制台错误 |
| 机器人无法连接 | 确认 WebSocket URL 正确 |
| 离线数据丢失 | 检查 IndexedDB 存储限制 |
| 音乐无法播放 | 确认音频文件路径正确 |
