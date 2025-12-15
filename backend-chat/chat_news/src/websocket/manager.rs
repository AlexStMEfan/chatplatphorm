// src/websocket/manager.rs
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, broadcast};
use uuid::Uuid;
use crate::models::ChatEvent;
use anyhow::Result;
use tracing::debug;

/// Размер буфера для broadcast каналов (сколько последних сообщений хранить)
const BROADCAST_CAPACITY: usize = 256;

#[derive(Clone)]
pub struct ConnectionManager {
    /// map: chat_id -> broadcast::Sender<ChatEvent>
    rooms: Arc<RwLock<HashMap<Uuid, broadcast::Sender<ChatEvent>>>>,
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            rooms: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Получить (или создать) broadcast::Sender для комнаты
    pub async fn get_or_create_room(&self, chat_id: Uuid) -> broadcast::Sender<ChatEvent> {
        // fast path
        {
            let rooms = self.rooms.read().await;
            if let Some(tx) = rooms.get(&chat_id) {
                return tx.clone();
            }
        }

        // slow path: create
        let mut rooms = self.rooms.write().await;
        // double-check
        if let Some(tx) = rooms.get(&chat_id) {
            return tx.clone();
        }
        let (tx, _rx) = broadcast::channel(BROADCAST_CAPACITY);
        rooms.insert(chat_id, tx.clone());
        debug!("created room broadcast for {}", chat_id);
        tx
    }

    /// broadcast event into room (ignores receivers dropped)
    pub async fn broadcast(&self, ev: ChatEvent) {
        let rooms = self.rooms.read().await;
        if let Some(tx) = rooms.get(&ev.chat_id) {
            let _ = tx.send(ev);
        }
    }
}