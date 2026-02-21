// Synapse OS — 菜单微服务
// Menu Service: 菜单分类、菜品、修饰符 CRUD
//
// ⚠️ 功能状态: 🔲 骨架已搭建，业务逻辑待从 Python 迁移
// 参考: backend/app/api/v1/menu.py, backend/app/models/menu.py

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

	// TODO: 注册 MenuService handler
	// pb.RegisterMenuServiceServer(grpcServer, &menuHandler{})

	grpc_health_v1.RegisterHealthServer(grpcServer, &healthChecker{})
	if env == "development" {
		reflection.Register(grpcServer)
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		log.Fatalf("❌ 菜单服务启动失败: %v", err)
	}

	go func() {
		log.Printf("🍽️ 菜单服务 (menu-service) 启动在 :%s", port)
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("❌ gRPC 服务失败: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	grpcServer.GracefulStop()
	log.Println("👋 菜单服务已停止")
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
