// src/kafka/producer.rs

use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::util::Timeout;
use std::time::Duration;
use tracing::{info, error};
use anyhow::Result;
use serde_json::to_string;

use crate::models::ChatEvent;

pub struct KafkaProducer {
    pub inner: FutureProducer,
    pub topic: String,
}

impl KafkaProducer {
    pub fn new(brokers: &str, topic: &str) -> Result<Self> {
        let producer = rdkafka::ClientConfig::new()
            .set("bootstrap.servers", brokers)
            .set("message.timeout.ms", "5000")
            .set("enable.idempotence", "true")
            .create()?;

        Ok(Self {
            inner: producer,
            topic: topic.to_string(),
        })
    }

    pub async fn send(&self, event: &ChatEvent) -> Result<()> {
        let payload = to_string(event)
            .map_err(|e| anyhow::anyhow!("Failed to serialize ChatEvent: {}", e))?;

        let key = event.chat_id.to_string();

        // ✅ Исправлено: убрали .timestamp() — rdkafka сам ставит timestamp
        let record = FutureRecord::to(&self.topic)
            .payload(&payload)
            .key(&key);

        match self.inner.send(record, Timeout::After(Duration::from_secs(5))).await {
            Ok((partition, offset)) => {
                info!("Event sent to topic={} partition={} offset={} chat_id={}",
                      self.topic, partition, offset, event.chat_id);
                Ok(())
            }
            Err((kafka_err, _msg)) => {
                error!("Kafka send failed: {:?}", kafka_err);
                Err(anyhow::anyhow!("Kafka delivery failed: {}", kafka_err))
            }
        }
    }
}

impl Clone for KafkaProducer {
    fn clone(&self) -> Self {
        Self {
            inner: self.inner.clone(),
            topic: self.topic.clone(),
        }
    }
}
