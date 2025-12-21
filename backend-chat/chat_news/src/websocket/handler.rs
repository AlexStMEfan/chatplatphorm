// src/websocket/handler.rs

use axum::extract::ws::{WebSocket, Message as WsMessage};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tracing::{debug, error, info};
use uuid::Uuid;
use std::sync::Arc;

use crate::{AppState, models::ChatEvent};

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
    // Разделяем WebSocket на отправку и приём
    let (mut ws_sender, mut ws_receiver) = ws.split();

    // Загружаем чаты пользователя
    let user_chats = match state.scylla.get_user_chat_ids(user_id).await {
        Ok(chats) => chats,
        Err(e) => {
            error!("Failed to load user chats for {}: {:?}", user_id, e);
            return;
        }
    };

    // Подписываем пользователя на каждый чат
    for chat_id in &user_chats {
        if state.scylla.is_user_in_chat(*chat_id, user_id).await.unwrap_or(false) {
            state.ws_manager.subscribe_user_to_chat(user_id, *chat_id).await;
            debug!("User {} subscribed to chat {}", user_id, chat_id);
        }
    }

    // Канал для получения событий чатов
    let (event_tx, mut event_rx) = mpsc::channel::<ChatEvent>(32);

    // Запускаем подписку на каждый чат
    let mut subscription_tasks = Vec::new();

    for chat_id in &user_chats {
        let mut room_rx = state.ws_manager.subscribe_to_chat(*chat_id).await;
        let tx = event_tx.clone(); // клонируем для задачи

        let task = tokio::spawn(async move {
            while let Ok(event) = room_rx.recv().await {
                if tx.send(event).await.is_err() {
                    break; // канал закрыт
                }
            }
        });

        subscription_tasks.push(task);
    }

    // Отправка событий клиенту
    let send_task = tokio::spawn(async move {
        while let Some(event) = event_rx.recv().await {
            let msg = WsMessageOut {
                r#type: "event".to_string(),
                payload: event,
            };
            let payload = match serde_json::to_string(&msg) {
                Ok(p) => p,
                Err(e) => {
                    error!("JSON serialize error: {:?}", e);
                    continue;
                }
            };
            if ws_sender.send(WsMessage::Text(payload)).await.is_err() {
                break; // клиент отключился
            }
        }
    });

    // Обработка входящих сообщений (команд)
    while let Some(result) = ws_receiver.next().await {
        match result {
            Ok(WsMessage::Text(text)) => {
                if let Ok(cmd) = serde_json::from_str::<WsCommand>(&text) {
                    if cmd.r#type == "subscribe" {
                        if state.scylla.is_user_in_chat(cmd.chat_id, user_id).await.unwrap_or(false) {
                            state.ws_manager.subscribe_user_to_chat(user_id, cmd.chat_id).await;
                            info!("User {} subscribed to chat {} via command", user_id, cmd.chat_id);
                        }
                    }
                }
            }
            Ok(WsMessage::Close(_)) => {
                info!("WebSocket closed by user {}", user_id);
                break;
            }
            Err(e) => {
                error!("WebSocket receive error: {:?}", e);
                break;
            }
            _ => continue,
        }
    }

    // Отписка от всех чатов при выходе
    for chat_id in &user_chats {
        state.ws_manager.unsubscribe_user_from_chat(user_id, *chat_id).await;
        debug!("User {} unsubscribed from chat {}", user_id, chat_id);
    }

    // Останавливаем задачи
    send_task.abort();
    for task in subscription_tasks {
        task.abort();
    }

    // Ждём немного, чтобы задачи завершились
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
}
