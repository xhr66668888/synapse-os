// Synapse OS — 实时事件总线 (Rust)
// Event Bus: WebSocket 网关 + 事件分发
//
// 职责:
//   - 管理 WebSocket 连接 (KDS 屏幕、取餐屏、POS 终端)
//   - 接收来自各微服务的事件 (通过 Azure Service Bus / Redis Streams)
//   - 将事件推送到已订阅的 WebSocket 客户端
//   - 支持房间/频道概念 (每个餐厅一个频道)
//
// ⚠️ 功能状态
// ✅ 已实现: 服务骨架
// 🔲 未实现: WebSocket 连接管理
// 🔲 未实现: Azure Service Bus 订阅
// 🔲 未实现: 事件路由 (订单事件 → KDS, 取餐事件 → 取餐屏)

use tracing::info;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter("event_bus=info")
        .init();

    let ws_port = std::env::var("WS_PORT").unwrap_or_else(|_| "8081".to_string());
    let grpc_port = std::env::var("GRPC_PORT").unwrap_or_else(|_| "50053".to_string());

    info!("📡 事件总线 (event-bus) WebSocket 端口: {}", ws_port);
    info!("📡 事件总线 (event-bus) gRPC 端口: {}", grpc_port);
    info!("🔲 WebSocket 连接管理待实现");

    // TODO: 启动 WebSocket 服务器
    // TODO: 启动 gRPC 服务器 (接收来自其他服务的事件)
    // TODO: 订阅 Azure Service Bus 队列

    tokio::signal::ctrl_c().await?;
    info!("👋 事件总线已停止");
    Ok(())
}
