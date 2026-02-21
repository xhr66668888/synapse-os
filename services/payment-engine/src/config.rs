// 支付引擎配置

use std::env;

pub struct Config {
    pub grpc_port: u16,
    pub database_url: String,
    pub stripe_api_key: String,     // 🔲 从 Azure Key Vault 获取
    pub stripe_webhook_secret: String, // 🔲 从 Azure Key Vault 获取
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            grpc_port: env::var("GRPC_PORT")
                .unwrap_or_else(|_| "50052".to_string())
                .parse()
                .unwrap_or(50052),
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://synapse:password@localhost:5432/synapse_os".to_string()),
            stripe_api_key: env::var("STRIPE_API_KEY").unwrap_or_default(),
            stripe_webhook_secret: env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default(),
        }
    }
}
