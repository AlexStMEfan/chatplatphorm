use crate::{db::Db, models::Message, websocket::gateway::WebSocketGateway};
use rdkafka::{
    consumer::{BaseConsumer, Consumer},
    Message,
};
use serde_json;
use std::time::Duration;
use tokio::time::sleep;

pub struct MessageProcessor {
    consumer: BaseConsumer,
    db: Db,
    ws_gateway: WebSocketGateway,
}

impl MessageProcessor {
    pub fn new(consumer: BaseConsumer, db: Db, ws_gateway: WebSocketGateway) -> Self {
        Self { consumer, db, ws_gateway }
    }

    pub async fn start(&self) -> ! {
        loop {
            match self.consumer.recv(Duration::from_millis(100)) {
                Ok(kafka_msg) => {
                    if let Some(payload) = kafka_msg.payload() {
                        if let Ok(message) = serde_json::from_slice::<Message>(payload) {
                            self.handle_message(message).await;
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Kafka error: {}", e);
                    sleep(Duration::from_secs(1)).await;
                }
            }
        }
    }

    async fn handle_message(&self, message: Message) {
        // 1. Сохранить в ScyllaDB
        if let Err(e) = self.db.insert_message(&message).await {
            tracing::error!("Failed to save message to DB: {}", e);
            return;
        }

        // 2. Доставить онлайн-пользователям
        self.ws_gateway.broadcast_to_chat(message.chat_id, &message).await;

        // 3. Отправить в Notification Service (можно в тот же Kafka топик)
        // self.notification_client.send(&message).await;
    }
}