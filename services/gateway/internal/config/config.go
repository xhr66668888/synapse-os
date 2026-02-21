// 网关配置管理
// 所有配置通过环境变量注入，适配 Azure AKS + Key Vault

package config

import "os"

// Config 网关配置
type Config struct {
	Env  string // development / staging / production
	Port string // HTTP 端口

	// JWT 配置
	JWTSecret     string
	JWTExpireHour int

	// CORS 允许的源
	AllowedOrigins []string

	// ==========================================
	// 下游服务地址 (gRPC)
	// 在 K8s 中通过 Service DNS 发现
	// 格式: <service-name>.<namespace>.svc.cluster.local:<port>
	// ==========================================
	OrderServiceAddr       string // order-service:50051
	MenuServiceAddr        string // menu-service:50051
	TableServiceAddr       string // table-service:50051
	StaffServiceAddr       string // staff-service:50051
	InventoryServiceAddr   string // inventory-service:50051
	ReportServiceAddr      string // report-service:50051
	ReservationServiceAddr string // reservation-service:50051
	LoyaltyServiceAddr     string // loyalty-service:50051

	// Rust 服务
	PaymentEngineAddr string // payment-engine:50052
	EventBusAddr      string // event-bus:50053

	// C++ 服务 (由中国团队维护)
	RobotControllerAddr string // robot-controller:50054
	VisionEngineAddr    string // vision-engine:50055
	TasteEngineAddr     string // taste-engine:50056

	// Python AI 服务 (REST, 非 gRPC)
	AIServiceURL string // http://ai-service:8000

	// Redis (Azure Cache for Redis)
	RedisAddr     string
	RedisPassword string
}

// Load 从环境变量加载配置
func Load() *Config {
	return &Config{
		Env:  getEnv("APP_ENV", "development"),
		Port: getEnv("PORT", "8080"),

		JWTSecret:     getEnv("JWT_SECRET", "change-me-in-production"),
		JWTExpireHour: 24,

		AllowedOrigins: []string{
			getEnv("CORS_ORIGIN", "http://localhost:3000"),
		},

		// Go 服务 (gRPC)
		OrderServiceAddr:       getEnv("ORDER_SERVICE_ADDR", "localhost:50051"),
		MenuServiceAddr:        getEnv("MENU_SERVICE_ADDR", "localhost:50051"),
		TableServiceAddr:       getEnv("TABLE_SERVICE_ADDR", "localhost:50051"),
		StaffServiceAddr:       getEnv("STAFF_SERVICE_ADDR", "localhost:50051"),
		InventoryServiceAddr:   getEnv("INVENTORY_SERVICE_ADDR", "localhost:50051"),
		ReportServiceAddr:      getEnv("REPORT_SERVICE_ADDR", "localhost:50051"),
		ReservationServiceAddr: getEnv("RESERVATION_SERVICE_ADDR", "localhost:50051"),
		LoyaltyServiceAddr:     getEnv("LOYALTY_SERVICE_ADDR", "localhost:50051"),

		// Rust 服务
		PaymentEngineAddr: getEnv("PAYMENT_ENGINE_ADDR", "localhost:50052"),
		EventBusAddr:      getEnv("EVENT_BUS_ADDR", "localhost:50053"),

		// C++ 服务
		RobotControllerAddr: getEnv("ROBOT_CONTROLLER_ADDR", "localhost:50054"),
		VisionEngineAddr:    getEnv("VISION_ENGINE_ADDR", "localhost:50055"),
		TasteEngineAddr:     getEnv("TASTE_ENGINE_ADDR", "localhost:50056"),

		// AI 服务
		AIServiceURL: getEnv("AI_SERVICE_URL", "http://localhost:8000"),

		// Redis
		RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
