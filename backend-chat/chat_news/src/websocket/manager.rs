// src/websocket/manager.rs
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::{RwLock, broadcast};
use uuid::Uuid;
use crate::models::ChatEvent;
use tracing::debug;

const BROADCAST_CAPACITY: usize = 256;

#[derive(Clone)]
pub struct ConnectionManager {
    pub(crate) rooms: Arc<RwLock<HashMap<Uuid, broadcast::Sender<ChatEvent>>>>,
    user_rooms: Arc<RwLock<HashMap<Uuid, HashSet<Uuid>>>>, // user_id -> Set<chat_id>
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            rooms: Arc::new(RwLock::new(HashMap::new())),
            user_rooms: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn subscribe_user_to_chat(&self, user_id: Uuid, chat_id: Uuid) {
        // Получаем sender для комнаты
        let tx = self.get_or_create_room(chat_id).await;
        
        // Сохраняем подписку пользователя
        let mut user_rooms = self.user_rooms.write().await;
        user_rooms.entry(user_id).or_default().insert(chat_id);
        
        debug!("User {} subscribed to chat {}", user_id, chat_id);
    }

    pub async fn unsubscribe_user_from_chat(&self, user_id: Uuid, chat_id: Uuid) {
        let mut user_rooms = self.user_rooms.write().await;
        if let Some(chats) = user_rooms.get_mut(&user_id) {
            chats.remove(&chat_id);
            if chats.is_empty() {
                user_rooms.remove(&user_id);
            }
        }
    }

    pub async fn get_or_create_room(&self, chat_id: Uuid) -> broadcast::Sender<ChatEvent> {
        {
            let rooms = self.rooms.read().await;
            if let Some(tx) = rooms.get(&chat_id) {
                return tx.clone();
            }
        }

        let mut rooms = self.rooms.write().await;
        if let Some(tx) = rooms.get(&chat_id) {
            return tx.clone();
        }
        let (tx, _rx) = broadcast::channel(BROADCAST_CAPACITY);
        rooms.insert(chat_id, tx.clone());
        tx
    }

    pub async fn broadcast(&self, ev: ChatEvent) {
        let rooms = self.rooms.read().await;
        if let Some(tx) = rooms.get(&ev.chat_id) {
            let _ = tx.send(ev);
        }
    }

    pub async fn get_user_chats(&self, user_id: Uuid) -> Vec<Uuid> {
        let user_rooms = self.user_rooms.read().await;
        user_rooms.get(&user_id).cloned().unwrap_or_default().into_iter().collect()
    }
}