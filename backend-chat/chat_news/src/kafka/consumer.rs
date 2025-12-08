use crate::models::Message;
use rdkafka::{
    Message as KafkaMessage, consumer::{Consumer, StreamConsumer}, message
};
use serde_json;
use tokio_stream::StreamExt;

pub struct NotificationConsumer {
    consumer: StreamConsumer,
}

impl NotificationConsumer {
    pub fn new(kafka_brokers: &str) -> Result<Self, rdkafka::error::KafkaError> {
        let consumer: StreamConsumer = rdkafka::ClientConfig::new()
            .set("bootstrap.servers", kafka_brokers)
            .set("group.id", "notification-service")
            .set("enable.auto.commit", "true")
            .create()?;
        
        consumer.subscribe(&["chat.messages"])?;
        
        Ok(Self { consumer })
    }

    pub async fn start(&self) -> () {
        let mut stream = self.consumer.stream();
        while let Some(Ok(message)) = stream.next().await {
            if let Some(payload) = message.payload() {
                if let Ok(message) = serde_json::from_slice::<Message>(payload) {
                    tracing::info!("Received message: {:?}", message);
                    // Позже добавите логику уведомлений
                }
            }
        }
    }
}