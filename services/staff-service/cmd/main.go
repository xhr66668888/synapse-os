// Synapse OS — 员工微服务
// Staff Service: 员工 CRUD、排班管理
// 功能状态: 骨架已搭建
// 参考: backend/app/api/v1/staff.py, backend/app/api/v1/schedule.py

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
		log.Printf("员工服务 (staff-service) 启动在 :%s", port)
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
