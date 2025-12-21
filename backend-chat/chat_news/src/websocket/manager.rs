// src/websocket/manager.rs

use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::{RwLock, broadcast};
use uuid::Uuid;
use crate::models::ChatEvent;
use tracing::debug;
use tokio::sync::broadcast::error::SendError as BroadcastSendError;


/// Максимальный размер буфера рассылки на один чат
const BROADCAST_CAPACITY: usize = 256;

#[derive(Debug)]
pub enum BroadcastError {
    SendFailed(broadcast::error::SendError<ChatEvent>),
}
/// Логическая "комната" чата — хранит канал рассылки и счётчик подписчиков
struct Room {
    pub tx: broadcast::Sender<ChatEvent>,
    subscribers: usize,
}

/// Менеджер WebSocket-подключений
#[derive(Clone)]
pub struct ConnectionManager {
    /// Активные чаты: chat_id → Room
    pub(crate) rooms: Arc<RwLock<HashMap<Uuid, Room>>>,
    /// Подписки пользователей: user_id → Set<chat_id>
    user_rooms: Arc<RwLock<HashMap<Uuid, HashSet<Uuid>>>>,
}

impl ConnectionManager {
    /// Создаёт новый менеджер
    pub fn new() -> Self {
        Self {
            rooms: Arc::new(RwLock::new(HashMap::new())),
            user_rooms: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Подписывает пользователя на чат
    pub async fn subscribe_user_to_chat(&self, user_id: Uuid, chat_id: Uuid) {
        let _tx = self.get_or_create_room(chat_id).await;

        let mut user_rooms = self.user_rooms.write().await;
        user_rooms.entry(user_id).or_default().insert(chat_id);

        let mut rooms = self.rooms.write().await;
        if let Some(room) = rooms.get_mut(&chat_id) {
            room.subscribers += 1;
        }

        debug!("User {} subscribed to chat {}", user_id, chat_id);
    }

    /// Отписывает пользователя от чата
    pub async fn unsubscribe_user_from_chat(&self, user_id: Uuid, chat_id: Uuid) {
        // Удаляем из списка чатов пользователя
        let mut user_rooms = self.user_rooms.write().await;
        if let Some(chats) = user_rooms.get_mut(&user_id) {
            chats.remove(&chat_id);
            if chats.is_empty() {
                user_rooms.remove(&user_id);
            }
        }

        // Уменьшаем счётчик, удаляем комнату при 0
        let mut rooms = self.rooms.write().await;
        if let Some(room) = rooms.get_mut(&chat_id) {
            room.subscribers = room.subscribers.saturating_sub(1);
            if room.subscribers == 0 {
                rooms.remove(&chat_id);
                debug!("Room {} removed (no subscribers)", chat_id);
            }
        }

        debug!("User {} unsubscribed from chat {}", user_id, chat_id);
    }

    /// Возвращает `Sender`, создаёт канал, если чата ещё нет
    pub async fn get_or_create_room(&self, chat_id: Uuid) -> broadcast::Sender<ChatEvent> {
        {
            let rooms = self.rooms.read().await;
            if let Some(room) = rooms.get(&chat_id) {
                return room.tx.clone();
            }
        }

        let (tx, _rx) = broadcast::channel(BROADCAST_CAPACITY);
        let room = Room {
            tx: tx.clone(),
            subscribers: 0,
        };

        let mut rooms = self.rooms.write().await;
        rooms.entry(chat_id).or_insert(room).tx.clone()
    }

    /// Рассылает событие всем в чате
    pub async fn broadcast(&self, ev: ChatEvent) -> Result<(), BroadcastError> {
    let chat_id = ev.chat_id;
    let rooms = self.rooms.read().await;
    if let Some(room) = rooms.get(&chat_id) {
        room.tx.send(ev).map_err(|e| BroadcastError::SendFailed(e))?;
    }
    Ok(())
}

    /// Возвращает список чатов, на которые подписан пользователь
    pub async fn get_user_chats(&self, user_id: Uuid) -> Vec<Uuid> {
        let user_rooms = self.user_rooms.read().await;
        user_rooms
            .get(&user_id)
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .collect()
    }

    /// Подписаться на события чата (всегда возвращает Receiver)
    pub async fn subscribe_to_chat(&self, chat_id: Uuid) -> broadcast::Receiver<ChatEvent> {
        let _tx = self.get_or_create_room(chat_id).await;
        _tx.subscribe()
    }
}
