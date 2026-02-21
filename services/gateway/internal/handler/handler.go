// 网关请求处理器
// 负责将 HTTP 请求路由到对应的下游微服务
//
// 当前状态: STUB (骨架)
// 需要补充: gRPC 客户端连接池、请求转换、错误映射
//
// ==========================================
// 功能状态标注
// 已实现: 健康检查、就绪检查、认证路由框架
// 未实现: 所有 ProxyTo* 方法 (需要连接各下游服务)
// ==========================================

package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// ==========================================
// 健康检查 已实现
// ==========================================

// HealthCheck 存活探针 (K8s livenessProbe)
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "gateway",
	})
}

// ReadinessCheck 就绪探针 (K8s readinessProbe)
// TODO: 检查所有下游服务连接状态
func ReadinessCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ready",
	})
}

// ==========================================
// 认证 未实现 (需要连接到用户数据库)
// ==========================================

// Login 用户登录
func Login(c *gin.Context) {
	// TODO: 验证凭据 → 生成 JWT → 返回 token
	c.JSON(http.StatusNotImplemented, gin.H{"error": "登录功能待实现"})
}

// Register 用户注册
func Register(c *gin.Context) {
	// TODO: 创建用户 → 发送验证邮件
	c.JSON(http.StatusNotImplemented, gin.H{"error": "注册功能待实现"})
}

// RefreshToken 刷新 JWT
func RefreshToken(c *gin.Context) {
	// TODO: 验证 refresh token → 发新 access token
	c.JSON(http.StatusNotImplemented, gin.H{"error": "令牌刷新功能待实现"})
}

// ==========================================
// Go 服务代理 全部未实现
// 需要: 建立 gRPC 连接 → 转换请求 → 转发 → 返回响应
// ==========================================

// ProxyToOrderService 转发到订单服务 (Go/gRPC)
func ProxyToOrderService(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "订单服务代理待实现"})
}

// ProxyToMenuService 转发到菜单服务 (Go/gRPC)
func ProxyToMenuService(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "菜单服务代理待实现"})
}

// ProxyToTableService 转发到桌台服务 (Go/gRPC)
func ProxyToTableService(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "桌台服务代理待实现"})
}

// ProxyToStaffService 转发到员工服务 (Go/gRPC)
func ProxyToStaffService(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "员工服务代理待实现"})
}

// ProxyToInventoryService 转发到库存服务 (Go/gRPC)
func ProxyToInventoryService(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "库存服务代理待实现"})
}

// ProxyToReportService 转发到报表服务 (Go/gRPC)
func ProxyToReportService(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "报表服务代理待实现"})
}

// ProxyToReservationService 转发到预订服务 (Go/gRPC)
func ProxyToReservationService(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "预订服务代理待实现"})
}

// ProxyToLoyaltyService 转发到忠诚度服务 (Go/gRPC)
func ProxyToLoyaltyService(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "忠诚度服务代理待实现"})
}

// ==========================================
// Rust 服务代理 全部未实现
// ==========================================

// ProxyToPaymentEngine 转发到支付引擎 (Rust/gRPC)
func ProxyToPaymentEngine(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "支付引擎代理待实现"})
}

// ==========================================
// C++ 服务代理 全部未实现
// 注意: C++ 服务由中国团队维护
// ==========================================

// ProxyToRobotController 转发到机器人控制器 (C++/gRPC)
// 炒菜机器人控制 — 由中国硬件团队负责对接
// gRPC proto: proto/synapse/v1/robot.proto
func ProxyToRobotController(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "机器人控制器代理待实现 — 等待中国团队对接"})
}

// ==========================================
// Python AI 服务代理 未实现
// ==========================================

// ProxyToAIService 转发到 AI 服务 (Python/REST)
// 使用 HTTP 转发 (非 gRPC)，因为 Python AI 服务使用 FastAPI
func ProxyToAIService(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "AI 服务代理待实现"})
}

// ==========================================
// WebSocket 未实现
// ==========================================

// WebSocketUpgrade 升级 HTTP 连接为 WebSocket
// 用于 KDS 实时订单推送、取餐屏幕状态更新
// 实际 WebSocket 管理由 Rust event-bus 服务处理
func WebSocketUpgrade(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "WebSocket 升级待实现 — 需连接 Rust event-bus"})
}
