// src/websocket/handler.rs
use axum::extract::ws::{WebSocket, Message as WsMessage};
use futures_util::stream::StreamExt;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::sync::Arc;
use tracing;
use futures_util::SinkExt;
use crate::{
    AppState,
    models::ChatEvent,
};

#[derive(Deserialize)]
struct WsCommand {
    r#type: String,
    chat_id: Uuid,
}

#[derive(Serialize)]
struct WsMessageOut {
    r#type: String,
    payload: ChatEvent,
}

pub async fn handle_websocket(
    ws: WebSocket,
    user_id: Uuid,
    state: Arc<AppState>,
) {
    let (mut sender, mut receiver) = ws.split();
    
    // Подписываем пользователя на его чаты
    let user_chats = state.ws_manager.get_user_chats(user_id).await;
    for chat_id in &user_chats {
        state.ws_manager.subscribe_user_to_chat(user_id, *chat_id).await;
    }
    
    // Создаём получатель для этой сессии
    let (tx, mut rx) = tokio::sync::mpsc::channel::<ChatEvent>(32);
    
    // Запускаем фоновую задачу для отправки сообщений
    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let Ok(json) = serde_json::to_string(&WsMessageOut {
                r#type: "message".to_string(),
                payload: event,
            }) {
                let _ = sender.send(WsMessage::Text(json)).await;
            }
        }
    });
    
    // Подписываемся на все чаты пользователя
    for chat_id in user_chats {
        let rooms = state.ws_manager.rooms.read().await;
        if let Some(room_tx) = rooms.get(&chat_id) {
            let mut room_rx = room_tx.subscribe();
            let tx_clone = tx.clone();
            tokio::spawn(async move {
                while let Ok(event) = room_rx.recv().await {
                    let _ = tx_clone.send(event).await;
                }
            });
        }
    }
    
    tracing::info!("WebSocket connected for user {}", user_id);
    
    // Обработка входящих сообщений
    while let Some(result) = receiver.next().await {
        match result {
            Ok(WsMessage::Text(text)) => {
                match serde_json::from_str::<WsCommand>(&text) {
                    Ok(cmd) => {
                        if cmd.r#type == "subscribe" {
                            state.ws_manager.subscribe_user_to_chat(user_id, cmd.chat_id).await;
                            tracing::debug!("User {} subscribed to chat {}", user_id, cmd.chat_id);
                        } else if cmd.r#type == "unsubscribe" {
                            state.ws_manager.unsubscribe_user_from_chat(user_id, cmd.chat_id).await;
                            tracing::debug!("User {} unsubscribed from chat {}", user_id, cmd.chat_id);
                        } else {
                            tracing::warn!("Unknown command from user {}: {}", user_id, text);
                        }
                    }
                    Err(e) => {
                        tracing::warn!("Failed to parse command: {:?}", e);
                    }
                }
            }
            Ok(WsMessage::Binary(_)) | 
            Ok(WsMessage::Ping(_)) | 
            Ok(WsMessage::Pong(_)) => {
                // Игнорируем
            }
            Ok(WsMessage::Close(_)) => {
                break;
            }
            Err(e) => {
                tracing::error!("WebSocket error for user {}: {:?}", user_id, e);
                break;
            }
        }
    }
    
    tracing::info!("WebSocket disconnected for user {}", user_id);
}