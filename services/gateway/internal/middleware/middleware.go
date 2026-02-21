// 通用中间件集合
// 包含: 日志、CORS、限流、请求 ID

package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/panshakerservices/synapse-os/services/gateway/internal/config"
)

// Logger 结构化请求日志中间件
// TODO: 接入 Azure Application Insights
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		latency := time.Since(start)

		// 生产环境应使用 zap 结构化日志
		gin.DefaultWriter.Write([]byte(
			c.Request.Method + " " +
				c.Request.URL.Path + " " +
				c.Writer.Header().Get("X-Request-ID") + " " +
				latency.String() + "\n",
		))
	}
}

// CORS 跨域资源共享中间件
func CORS(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		// 检查是否在允许列表中
		allowed := false
		for _, o := range cfg.AllowedOrigins {
			if o == origin || o == "*" {
				allowed = true
				break
			}
		}

		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-ID")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Max-Age", "86400")
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// RateLimiter 请求限流中间件
// TODO: 使用 Redis 实现分布式限流 (令牌桶算法)
// 当前: 仅占位，未实现限流逻辑
func RateLimiter() gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: 从 Redis 获取当前窗口计数，超限返回 429
		c.Next()
	}
}

// RequestID 为每个请求生成唯一追踪 ID
// 用于 Azure Application Insights 分布式追踪
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateID()
		}
		c.Header("X-Request-ID", requestID)
		c.Set("request_id", requestID)
		c.Next()
	}
}

func generateID() string {
	// 简单实现，生产环境使用 UUID v4
	return time.Now().Format("20060102150405.000000")
}
