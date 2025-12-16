// src/kafka/consumer.rs
use rdkafka::{
    consumer::{StreamConsumer, Consumer},
    message::Message, // ← КЛЮЧЕВОЙ ИМПОРТ
    ClientConfig,
};
use tokio_stream::StreamExt;
use tracing::{info, error};
use serde_json::from_slice;
use anyhow::Result;
use std::sync::Arc;

use crate::{
    db::messages::{ScyllaDb, Message as DbMessage}, // ← переименуйте импорт
    models::ChatEvent,
    websocket::manager::ConnectionManager,
};

pub async fn run_consumer(
    brokers: &str,
    topic: &str,
    scylla: Arc<ScyllaDb>,
    ws_manager: Arc<ConnectionManager>,
) -> Result<()> {
    let consumer: StreamConsumer = ClientConfig::new()
        .set("bootstrap.servers", brokers)
        .set("group.id", "chat-service-group")
        .set("enable.partition.eof", "false")
        .create()?;

    consumer.subscribe(&[topic])?;

    let mut stream = consumer.stream();

    while let Some(Ok(msg)) = stream.next().await {
        if let Some(payload) = msg.payload() { // ← Теперь работает
            match from_slice::<ChatEvent>(payload) {
                Ok(ev) => {
                    let db_msg = DbMessage::from_chat_event(ev.clone());
                    if let Err(e) = scylla.insert_message(&db_msg).await {
                        error!("Scylla insert error: {:?}", e);
                    } else {
                        info!("Stored message {}", db_msg.message_id);
                        ws_manager.broadcast(ev).await; // ← ChatEvent
                    }
                }
                Err(e) => error!("JSON parse error: {:?}", e),
            }
        }
    }

    Ok(())
}