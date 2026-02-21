# ==========================================
# Synapse OS — API Gateway Docker 镜像
# 多阶段构建，最终镜像 ~15MB
# ==========================================

# 阶段 1: 编译
FROM golang:1.22-alpine AS builder

WORKDIR /build

# 依赖缓存
COPY go.mod go.sum ./
RUN go mod download

# 编译
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o gateway ./cmd/main.go

# 阶段 2: 运行
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app

COPY --from=builder /build/gateway .

EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["./gateway"]
