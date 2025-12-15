// src/websocket/handler.rs
use axum::extract::ws::{WebSocket, Message as WsMessage};
use futures_util::stream::StreamExt;
use serde::Serialize;
use uuid::Uuid;
use std::sync::Arc;
use tracing;

use crate::{AppState, db::messages::Message as DbMessage};

#[derive(Serialize)]
struct OutboundMessage {
    chat_id: Uuid,
    message_id: Uuid,
    user_id: Uuid,
    content: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

pub async fn handle_websocket(
    ws: WebSocket,
    user_id: Uuid,
    state: Arc<AppState>,
) {
    let (mut sender, mut receiver) = ws.split();

    // Отправка непрочитанных сообщений (если реализовано в ScyllaDb)
    if let Ok(messages) = state.scylla.get_unread_messages(user_id).await {
        for msg in messages {
            if let Ok(json) = serde_json::to_string(&OutboundMessage {
                chat_id: msg.chat_id,
                message_id: msg.message_id,
                user_id: msg.user_id,
                content: msg.content,
                created_at: msg.created_at,
            }) {
                let _ = sender.send(WsMessage::Text(json)).await;
            }
        }
    }

    // Обработка входящих сообщений от клиента
    while let Some(Ok(WsMessage::Text(text))) = receiver.next().await {
        tracing::debug!("User {} sent: {}", user_id, text);
        // Позже: обработка команд вроде {"type":"read", "chat_id":"..."}
    }

    tracing::info!("WebSocket connection closed for user {}", user_id);
}