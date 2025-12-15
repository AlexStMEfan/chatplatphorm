use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::util::Timeout;
use std::time::Duration;
use tracing::error;
use anyhow::Result;
use crate::models::ChatEvent;

pub struct KafkaProducer {
    pub inner: FutureProducer,
    pub topic: String,
}

impl KafkaProducer {
    /// Создает нового KafkaProducer с заданными брокерами и топиком
    pub fn new(brokers: &str, topic: &str) -> Result<Self> {
        use rdkafka::ClientConfig;

        let producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", brokers)
            .set("message.timeout.ms", "5000")
            .create()?;

        Ok(Self {
            inner: producer,
            topic: topic.to_string(),
        })
    }

    /// Отправляет сообщение в Kafka
    pub async fn send_message(&self, ev: &ChatEvent) -> Result<()> {
        let payload = serde_json::to_string(ev)?;
        let key = ev.chat_id.to_string();

        let record = FutureRecord::to(&self.topic)
            .payload(&payload)
            .key(&key);

        // Отправка и ожидание до 5 секунд
        match self.inner.send(record, Timeout::After(Duration::from_secs(5))).await {
            Ok((_partition, _offset)) => Ok(()),
            Err((kafka_err, _msg)) => {
                error!("Kafka delivery error: {:?}", kafka_err);
                Err(anyhow::anyhow!("Kafka delivery error"))
            }
        }
    }
}