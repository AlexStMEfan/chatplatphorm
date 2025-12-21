use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WsInMessage {
    pub chat_id: Uuid,
    pub content: Option<String>,
    pub media_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: i64,
    pub iat: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshToken {
    pub id: Uuid,
    pub user_id: Uuid,
    pub token: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub revoked: bool,
}

#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    
}

#[derive(Debug, Serialize)]
pub struct TokenPairResponse {
    pub access_token: String,
    pub access_expires: i64,
    pub refresh_token: String,
    pub refresh_expires: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatEvent {
    pub chat_id: Uuid,
    pub message_id: Uuid,
    pub user_id: Uuid,
    pub content: Option<String>,
    pub media_urls: Option<Vec<String>>,
    pub media_meta: Option<serde_json::Value>, // ← Оставить как есть
    pub created_at: DateTime<Utc>,
    pub edited_at: Option<DateTime<Utc>>,
    pub edited_by: Option<Uuid>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub is_deleted: Option<bool>,
    pub version: Option<usize>,
}

#[derive(Clone)]
pub struct UserUuid(pub Uuid);