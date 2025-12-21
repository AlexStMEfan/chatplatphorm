// src/kafka/consumer.rs

use rdkafka::{
    consumer::{StreamConsumer, Consumer, CommitMode},
    Message,
};
use tokio_stream::StreamExt;
use tracing::{info, error, trace};
use serde_json::from_slice;
use anyhow::Result;
use std::sync::Arc;

// ✅ Достаточно только Headers
use rdkafka::message::Headers;

use crate::{
    db::messages::Message as DbMessage,
    db::ScyllaDb,
    models::ChatEvent,
    websocket::manager::ConnectionManager,
};

pub async fn run_consumer(
    brokers: &str,
    topic: &str,
    scylla: Arc<ScyllaDb>,
    ws_manager: Arc<ConnectionManager>,
) -> Result<()> {
    let consumer: StreamConsumer = rdkafka::ClientConfig::new()
        .set("bootstrap.servers", brokers)
        .set("group.id", "chat-service-group-v1")
        .set("session.timeout.ms", "6000")
        .set("enable.auto.commit", "false")
        .set("auto.offset.reset", "earliest")
        .set("enable.partition.eof", "false")
        .set("fetch.wait.max.ms", "500")
        .create()?;

    consumer.subscribe(&[topic])?;

    info!("Kafka consumer started, subscribed to topic '{}'", topic);

    let mut stream = consumer.stream();

    while let Some(result) = stream.next().await {
        match result {
            Ok(borrowed_message) => {
                if let Some(payload) = borrowed_message.payload() {
                    match from_slice::<ChatEvent>(payload) {
                        Ok(event) => {
                            let event_clone = event.clone();
                            let db_msg = DbMessage::from_chat_event(event);

                            if let Err(e) = scylla.insert_message(&db_msg).await {
                                error!("Failed to insert message {} into Scylla: {:?}", db_msg.message_id, e);
                                continue;
                            }

                            info!("Stored message {} for chat {}", db_msg.message_id, db_msg.chat_id);

                            if let Err(e) = ws_manager.broadcast(event_clone).await {
                                error!("Failed to broadcast event {}: {:?}", db_msg.message_id, e);
                            }

                            // ✅ Исправлено: убрана аннотация Result
                            consumer.commit_message(&borrowed_message, CommitMode::Async);
                        }
                        Err(e) => {
                            error!("Failed to parse Chat)))) from Kafka: {:?}", e);
                            consumer.commit_message(&borrowed_message, CommitMode::Async);
                        }
                    }
                } else {
                    trace!("Received empty Kafka message (no payload)");
                    if let Some(headers) = borrowed_message.headers() {
                        trace!("Empty message with {} headers", headers.iter().count());
                    }
                    // ✅ Исправлено здесь тоже
                    consumer.commit_message(&borrowed_message, CommitMode::Async);
                }
            }
            Err(e) => {
                error!("Kafka consumer stream error: {:?}", e);
                continue;
            }
        }
    }

    Ok(())
}