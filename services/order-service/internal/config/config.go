// 订单服务配置

package config

import "os"

type Config struct {
	Env      string
	GRPCPort string

	// PostgreSQL (Azure Database for PostgreSQL)
	DatabaseURL string

	// Redis (Azure Cache for Redis)
	RedisAddr     string
	RedisPassword string

	// 事件总线 (Azure Service Bus / Rust event-bus)
	EventBusAddr string
}

func Load() *Config {
	return &Config{
		Env:           getEnv("APP_ENV", "development"),
		GRPCPort:      getEnv("GRPC_PORT", "50051"),
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://synapse:password@localhost:5432/synapse_os"),
		RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		EventBusAddr:  getEnv("EVENT_BUS_ADDR", "localhost:50053"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
