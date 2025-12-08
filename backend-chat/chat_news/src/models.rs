use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Serialize, Deserialize, Clone)]
#[derive(Debug)]
pub struct Message {
    pub chat_id: Uuid,
    pub message_id: Uuid,
    pub user_id: Uuid,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Deserialize)]
pub struct SendMessageRequest {
    pub chat_id: Uuid,
    pub content: String,
}

#[derive(Serialize)]
pub struct SendMessageResponse {
    pub message_id: Uuid,
}