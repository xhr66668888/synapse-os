// Synapse OS — 库存微服务
// Inventory Service: 库存追踪、出入库管理、低库存预警
// ⚠️ 功能状态: 🔲 骨架已搭建
// 参考: backend/app/api/v1/inventory.py
// 注意: 未来需与 C++ vision-engine 联动，接收视觉识别结果自动扣减库存

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
)

func main() {
	port := getEnv("GRPC_PORT", "50051")
	grpcServer := grpc.NewServer()
	grpc_health_v1.RegisterHealthServer(grpcServer, &healthChecker{})

	lis, _ := net.Listen("tcp", fmt.Sprintf(":%s", port))
	go func() {
		log.Printf("📦 库存服务 (inventory-service) 启动在 :%s", port)
		grpcServer.Serve(lis)
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	grpcServer.GracefulStop()
}

type healthChecker struct {
	grpc_health_v1.UnimplementedHealthServer
}

func getEnv(k, f string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return f
}
