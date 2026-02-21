// JWT 认证中间件
// 校验 Authorization: Bearer <token> 头

package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/panshakerservices/synapse-os/services/gateway/internal/config"
)

// JWTAuth JWT 认证中间件
func JWTAuth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "缺少认证令牌"})
			c.Abort()
			return
		}

		// 解析 Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "认证格式错误，需要 Bearer token"})
			c.Abort()
			return
		}

		tokenStr := parts[1]

		// 解析并验证 JWT
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "令牌无效或已过期"})
			c.Abort()
			return
		}

		// 从 claims 中提取用户信息
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			c.Set("user_id", claims["sub"])
			c.Set("user_role", claims["role"])
			c.Set("restaurant_id", claims["restaurant_id"])
		}

		c.Next()
	}
}
