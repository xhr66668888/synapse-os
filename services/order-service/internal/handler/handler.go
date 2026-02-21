// 订单服务 gRPC Handler
//
// ==========================================
// ⚠️ 功能状态
// ✅ 已实现: 服务注册框架、健康检查、日志拦截器
// 🔲 待实现: CreateOrder, GetOrder, UpdateOrderStatus, ListOrders, SplitCheck
// 🔲 待迁移: 从 Python backend/app/api/v1/orders.py 迁移业务逻辑
// ==========================================

package handler

import (
	"context"
	"log"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/status"
)

// ==========================================
// 健康检查 ✅ 已实现
// ==========================================

type healthChecker struct {
	grpc_health_v1.UnimplementedHealthServer
}

func NewHealthChecker() grpc_health_v1.HealthServer {
	return &healthChecker{}
}

func (h *healthChecker) Check(ctx context.Context, req *grpc_health_v1.HealthCheckRequest) (*grpc_health_v1.HealthCheckResponse, error) {
	return &grpc_health_v1.HealthCheckResponse{
		Status: grpc_health_v1.HealthCheckResponse_SERVING,
	}, nil
}

// ==========================================
// 日志拦截器 ✅ 已实现
// ==========================================

// LoggingInterceptor gRPC 请求日志
func LoggingInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	start := time.Now()
	resp, err := handler(ctx, req)
	log.Printf("[订单服务] %s | %v | err=%v", info.FullMethod, time.Since(start), err)
	return resp, err
}

// ==========================================
// 订单服务接口 🔲 全部待实现
//
// 当 proto/synapse/v1/order.proto 编译后,
// 替换为 pb.RegisterOrderServiceServer(...)
// ==========================================

// RegisterOrderService 注册订单服务到 gRPC 服务器
// TODO: proto 编译后替换为类型安全的注册
func RegisterOrderService(s *grpc.Server) {
	// 占位 — proto 编译后启用以下代码:
	// pb.RegisterOrderServiceServer(s, &orderServiceImpl{})
	log.Println("📦 订单服务 handler 已注册 (等待 proto 编译)")
}

// ==========================================
// 以下方法需要从 Python 迁移
// 参考: backend/app/api/v1/orders.py
// ==========================================

// CreateOrder 创建订单
// 🔲 待实现
// 业务逻辑:
//  1. 验证菜品可用性 (调用 menu-service)
//  2. 计算价格 (含修饰符、折扣、税)
//  3. 写入数据库
//  4. 发布事件到 event-bus (通知 KDS)
//  5. 如果有机器人菜品，通知 robot-controller
func CreateOrder() {
	_ = status.Error(codes.Unimplemented, "CreateOrder 待实现")
}

// GetOrder 查询单个订单
// 🔲 待实现
func GetOrder() {
	_ = status.Error(codes.Unimplemented, "GetOrder 待实现")
}

// ListOrders 查询订单列表 (分页)
// 🔲 待实现
func ListOrders() {
	_ = status.Error(codes.Unimplemented, "ListOrders 待实现")
}

// UpdateOrderStatus 更新订单状态
// 🔲 待实现
// 状态流转: pending → confirmed → preparing → ready → completed
// 每次状态更新需要发布事件到 event-bus
func UpdateOrderStatus() {
	_ = status.Error(codes.Unimplemented, "UpdateOrderStatus 待实现")
}

// SplitCheck 分单
// 🔲 待实现
// 支持: 按座位分、按商品分、AA平分
func SplitCheck() {
	_ = status.Error(codes.Unimplemented, "SplitCheck 待实现")
}

// CancelOrder 取消订单
// 🔲 待实现
// 需要: 检查是否可取消 → 退款 (调用 payment-engine) → 通知 KDS
func CancelOrder() {
	_ = status.Error(codes.Unimplemented, "CancelOrder 待实现")
}
