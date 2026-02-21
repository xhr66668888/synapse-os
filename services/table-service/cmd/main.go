// Synapse OS — 桌台微服务
// Table Service: 桌台管理、QR 码生成、状态追踪
//
// ⚠️ 功能状态: 🔲 骨架已搭建，业务逻辑待从 Python 迁移
// 参考: backend/app/api/v1/tables.py, backend/app/models/table.py

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
)

func main() {
	port := getEnv("GRPC_PORT", "50051")
	env := getEnv("APP_ENV", "development")

	grpcServer := grpc.NewServer()
	// TODO: pb.RegisterTableServiceServer(grpcServer, &tableHandler{})
	grpc_health_v1.RegisterHealthServer(grpcServer, &healthChecker{})
	if env == "development" {
		reflection.Register(grpcServer)
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		log.Fatalf("❌ 桌台服务启动失败: %v", err)
	}

	go func() {
		log.Printf("🪑 桌台服务 (table-service) 启动在 :%s", port)
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("❌ gRPC 服务失败: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	grpcServer.GracefulStop()
}

type healthChecker struct {
	grpc_health_v1.UnimplementedHealthServer
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
