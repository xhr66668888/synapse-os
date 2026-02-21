// Synapse OS — API Gateway
// API 网关服务入口
//
// 职责:
//   - 路由分发到各个下游微服务 (gRPC)
//   - JWT 认证与权限校验
//   - 请求限流 (Rate Limiting)
//   - CORS 处理
//   - 请求日志与链路追踪
//
// 部署: Azure AKS
// 端口: 8080 (HTTP) / 8443 (HTTPS)

package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/panshakerservices/synapse-os/services/gateway/internal/config"
	"github.com/panshakerservices/synapse-os/services/gateway/internal/handler"
	"github.com/panshakerservices/synapse-os/services/gateway/internal/middleware"
	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg := config.Load()

	// 生产环境使用 release 模式
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// ==========================================
	// 中间件链
	// ==========================================
	router.Use(gin.Recovery())
	router.Use(middleware.Logger())        // 结构化日志
	router.Use(middleware.CORS(cfg))       // CORS 配置
	router.Use(middleware.RateLimiter())   // 请求限流
	router.Use(middleware.RequestID())     // 请求追踪 ID

	// ==========================================
	// 健康检查 (不需要认证)
	// ==========================================
	router.GET("/health", handler.HealthCheck)
	router.GET("/ready", handler.ReadinessCheck)

	// ==========================================
	// API v1 路由组
	// ==========================================
	v1 := router.Group("/api/v1")
	{
		// 认证 (公开)
		auth := v1.Group("/auth")
		{
			auth.POST("/login", handler.Login)
			auth.POST("/register", handler.Register)
			auth.POST("/refresh", handler.RefreshToken)
		}

		// 以下路由需要 JWT 认证
		protected := v1.Group("")
		protected.Use(middleware.JWTAuth(cfg))
		{
			// 订单管理 → order-service (Go/gRPC)
			protected.Any("/orders/*path", handler.ProxyToOrderService)

			// 菜单管理 → menu-service (Go/gRPC)
			protected.Any("/menu/*path", handler.ProxyToMenuService)

			// 桌台管理 → table-service (Go/gRPC)
			protected.Any("/tables/*path", handler.ProxyToTableService)

			// 员工管理 → staff-service (Go/gRPC)
			protected.Any("/staff/*path", handler.ProxyToStaffService)

			// 库存管理 → inventory-service (Go/gRPC)
			protected.Any("/inventory/*path", handler.ProxyToInventoryService)

			// 报表 → report-service (Go/gRPC)
			protected.Any("/reports/*path", handler.ProxyToReportService)

			// 预订 → reservation-service (Go/gRPC)
			protected.Any("/reservations/*path", handler.ProxyToReservationService)

			// 忠诚度 → loyalty-service (Go/gRPC)
			protected.Any("/loyalty/*path", handler.ProxyToLoyaltyService)

			// 支付 → payment-engine (Rust/gRPC)
			protected.Any("/payments/*path", handler.ProxyToPaymentEngine)

			// 机器人控制 → robot-controller (C++/gRPC)
			// 注意: 机器人控制器由中国团队维护，gRPC proto 定义在 proto/synapse/v1/robot.proto
			protected.Any("/robot/*path", handler.ProxyToRobotController)

			// AI 服务 → ai-service (Python/REST)
			protected.Any("/ai/*path", handler.ProxyToAIService)
		}

		// WebSocket 连接 (KDS、取餐屏实时推送)
		// → event-bus (Rust/WebSocket)
		v1.GET("/ws", middleware.JWTAuth(cfg), handler.WebSocketUpgrade)
	}

	// ==========================================
	// 启动 HTTP 服务器 (优雅关闭)
	// ==========================================
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 后台启动
	go func() {
		log.Printf("Synapse OS Gateway 启动在 :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("服务启动失败: %v", err)
		}
	}()

	// 等待中断信号，优雅关闭
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("正在关闭网关服务...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("强制关闭: %v", err)
	}
	log.Println("网关服务已停止")
}
