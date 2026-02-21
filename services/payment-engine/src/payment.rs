// 支付模块
//
// ==========================================
// 支付处理核心逻辑
//
// 全部待实现 — 以下是接口定义，具体实现需要:
//   1. 注册 Stripe 商户账户
//   2. 获取 API 密钥 (存入 Azure Key Vault)
//   3. 实现 PaymentIntent 创建流程
//   4. 处理 Webhook 回调
// ==========================================

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// 支付请求
#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentRequest {
    /// 订单 ID
    pub order_id: String,
    /// 金额 (美分，避免浮点精度问题)
    pub amount_cents: i64,
    /// 币种 (USD / CNY)
    pub currency: String,
    /// 支付方式
    pub method: PaymentMethod,
    /// 餐厅 ID
    pub restaurant_id: String,
}

/// 支付方式
#[derive(Debug, Serialize, Deserialize)]
pub enum PaymentMethod {
    /// 信用卡 / 借记卡 (Stripe)
    Card,
    /// 现金
    Cash,
    /// Apple Pay / Google Pay (Stripe)
    DigitalWallet,
    /// 微信支付 (中国市场) 待实现
    WeChatPay,
    /// 支付宝 (中国市场) 待实现
    AliPay,
}

/// 支付结果
#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentResult {
    pub payment_id: String,
    pub status: PaymentStatus,
    /// 第三方交易 ID (Stripe charge id 等)
    pub transaction_id: Option<String>,
}

/// 支付状态
#[derive(Debug, Serialize, Deserialize)]
pub enum PaymentStatus {
    Pending,
    Completed,
    Failed,
    Refunded,
}

/// 支付处理器 trait
/// 各支付网关实现此 trait
pub trait PaymentProcessor: Send + Sync {
    /// 创建支付
    fn create_payment(&self, req: &PaymentRequest) -> Result<PaymentResult, PaymentError>;
    /// 退款
    fn refund(&self, payment_id: &str, amount_cents: i64) -> Result<PaymentResult, PaymentError>;
    /// 查询支付状态
    fn get_status(&self, payment_id: &str) -> Result<PaymentStatus, PaymentError>;
}

/// 支付错误
#[derive(Debug, thiserror::Error)]
pub enum PaymentError {
    #[error("支付网关错误: {0}")]
    GatewayError(String),
    #[error("卡片被拒: {0}")]
    CardDeclined(String),
    #[error("金额无效")]
    InvalidAmount,
    #[error("内部错误: {0}")]
    Internal(String),
}

// ==========================================
// Stripe 支付处理器 待实现
// ==========================================

/// Stripe 支付处理器
pub struct StripeProcessor {
    // pub client: stripe::Client,  // 需要 stripe crate
    pub api_key: String,
}

impl StripeProcessor {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }
}

// TODO: impl PaymentProcessor for StripeProcessor { ... }

// ==========================================
// 现金支付处理器 (本地记录，无需外部 API)
// ==========================================

pub struct CashProcessor;

impl CashProcessor {
    /// 记录现金支付
    /// 只需要在数据库中创建支付记录
    pub fn record_payment(order_id: &str, amount_cents: i64) -> PaymentResult {
        PaymentResult {
            payment_id: Uuid::new_v4().to_string(),
            status: PaymentStatus::Completed,
            transaction_id: None, // 现金没有第三方交易 ID
        }
    }
}
