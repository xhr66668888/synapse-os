// Synapse OS — 忠诚度微服务
// Loyalty Service: 会员体系、积分系统、奖励商城
// 功能状态: 骨架已搭建
// 参考: backend/app/api/v1/loyalty.py, backend/app/models/loyalty.py

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
		log.Printf("忠诚度服务 (loyalty-service) 启动在 :%s", port)
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
