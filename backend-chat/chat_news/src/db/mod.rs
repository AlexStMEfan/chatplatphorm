// src/db/mod.rs

pub mod messages;

use rdkafka::ClientConfig;
use crate::config::Config;
use std::sync::Arc;
use anyhow::Result;

#[derive(Clone)]
pub struct Db {
    pub scylla: messages::ScyllaDb,
    pub kafka: Arc<rdkafka::producer::FutureProducer>,
}

impl Db {
    pub async fn connect(config: &Config) -> Result<Self> {
        // 1. Scylla
        let scylla = messages::ScyllaDb::connect(&config.scylla_nodes, &config.scylla_keyspace)
            .await
            .map_err(|e| anyhow::anyhow!("Scylla connect error: {}", e))?;

        // 2. Kafka
        let kafka = ClientConfig::new()
            .set("bootstrap.servers", &config.kafka_brokers) // ✅ &Vec<String> → join
            .set("message.timeout.ms", "5000")
            .create::<rdkafka::producer::FutureProducer>()
            .map_err(|e| anyhow::anyhow!("Kafka producer create error: {}", e))?;

        let kafka = Arc::new(kafka);

        Ok(Db { scylla, kafka })
    }
}

pub use messages::{ScyllaDb};