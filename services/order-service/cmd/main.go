// Synapse OS — 订单微服务
// Order Service (Go + gRPC + PostgreSQL)
//
// 职责:
//   - 订单全生命周期管理 (创建、更新、取消、完成)
//   - 订单项管理
//   - 分单 (Split Check) 逻辑
//   - 课程管理 (Course Management: 前菜→主菜→甜点)
//   - 订单事件发布 (通过 Azure Service Bus)
//
// ==========================================
// ⚠️ 功能状态
// ✅ 骨架已搭建: 项目结构、gRPC server、配置
// 🔲 待实现: 数据库操作、业务逻辑 (从 Python FastAPI 迁移)
// 🔲 待实现: 事件发布 (订单创建/完成 → event-bus)
// ==========================================

package main

import (
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"

	"google.golang.org/grpc"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

	"github.com/panshakerservices/synapse-os/services/order-service/internal/config"
	"github.com/panshakerservices/synapse-os/services/order-service/internal/handler"
)

func main() {
	cfg := config.Load()

	// 创建 gRPC 服务器
	grpcServer := grpc.NewServer(
		grpc.UnaryInterceptor(handler.LoggingInterceptor),
	)

	// 注册订单服务 handler
	// TODO: 生成 proto 后替换为: pb.RegisterOrderServiceServer(grpcServer, orderHandler)
	handler.RegisterOrderService(grpcServer)

	// 注册健康检查 (K8s 探针)
	grpc_health_v1.RegisterHealthServer(grpcServer, handler.NewHealthChecker())

	// 开发环境启用反射 (方便 grpcurl 调试)
	if cfg.Env == "development" {
		reflection.Register(grpcServer)
	}

	// 监听端口
	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", cfg.GRPCPort))
	if err != nil {
		log.Fatalf("❌ 订单服务启动失败: %v", err)
	}

	// 后台启动 gRPC 服务
	go func() {
		log.Printf("📦 订单服务 (order-service) 启动在 :%s", cfg.GRPCPort)
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("❌ gRPC 服务失败: %v", err)
		}
	}()

	// 优雅关闭
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("⏳ 正在关闭订单服务...")
	grpcServer.GracefulStop()
	log.Println("👋 订单服务已停止")
}
