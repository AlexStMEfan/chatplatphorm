use crate::models::Message;
use std::collections::HashMap;
use tokio::sync::broadcast;
use uuid::Uuid;

#[derive(Clone)]
pub struct WebSocketGateway {
    // chat_id -> список отправителей для онлайн-пользователей
    senders: std::sync::Arc<tokio::sync::RwLock<HashMap<Uuid, Vec<broadcast::Sender<String>>>>>,
}

impl WebSocketGateway {
    pub fn new() -> Self {
        Self {
            senders: std::sync::Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        }
    }

    pub async fn add_user_to_chat(&self, chat_id: Uuid, sender: broadcast::Sender<String>) {
        let mut senders = self.senders.write().await;
        senders.entry(chat_id).or_default().push(sender);
    }

    pub async fn broadcast_to_chat(&self, chat_id: Uuid, message: &Message) {
        let senders = self.senders.read().await;
        if let Some(chat_senders) = senders.get(&chat_id) {
            let msg_json = serde_json::to_string(message).unwrap();
            for sender in chat_senders {
                let _ = sender.send(msg_json.clone());
            }
        }
    }
}