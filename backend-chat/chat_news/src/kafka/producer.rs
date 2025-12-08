use crate::models::Message;
use rdkafka::{
    producer::{FutureProducer, FutureRecord},
    util::Timeout,
    ClientConfig,
};
use serde_json;
use std::time::Duration;

pub struct MessageProducer {
    producer: FutureProducer,
}

impl MessageProducer {
    pub fn new(brokers: &str) -> Result<Self, rdkafka::error::KafkaError> {
        let producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", brokers)
            .set("message.timeout.ms", "5000")
            .create()?;
        
        Ok(Self { producer })
    }

    pub async fn send(&self, message: &Message) -> Result<(), rdkafka::error::KafkaError> {
        let payload = serde_json::to_vec(message)?;
        let record = FutureRecord::to("chat.messages")
            .key(&message.chat_id.to_string())
            .payload(&payload);
        
        self.producer
            .send(record, Timeout::After(Duration::from_secs(1)))
            .await?;
        
        Ok(())
    }
}