use rdkafka::{
    consumer::{Consumer, StreamConsumer, CommitMode},
    message::BorrowedMessage as KafkaMessage,
    ClientConfig,
};
use tokio_stream::StreamExt;
use tracing::{info, error};
use serde_json::from_slice;
use anyhow::Result;
use std::sync::Arc;
use crate::db::messages::{ScyllaDb, Message as DbMessage};
use crate::models::ChatEvent;

pub async fn run_consumer(brokers: &str, topic: &str, scylla: Arc<ScyllaDb>) -> Result<()> {
    let consumer: StreamConsumer = ClientConfig::new()
        .set("bootstrap.servers", brokers)
        .set("group.id", "chat-service-group")
        .set("enable.partition.eof", "false")
        .create()?;

    consumer.subscribe(&[topic])?;

    let mut stream = consumer.stream();

    while let Some(msg) = stream.next().await {
        match msg {
            Ok(m) => {
                if let Some(payload) = m.payload_len() {
                    match from_slice::<ChatEvent>(payload) {
                        Ok(ev) => {
                            let db_msg = DbMessage {
                                chat_id: ev.chat_id,
                                message_id: ev.message_id,
                                user_id: ev.user_id,
                                content: ev.content.clone(),
                                media_urls: ev.media_urls.clone(),
                                media_meta: ev.media_meta.clone(),
                                created_at: ev.created_at,
                                edited_at: ev.edited_at,
                                edited_by: ev.edited_by,
                                deleted_at: ev.deleted_at,
                                is_deleted: ev.is_deleted.unwrap_or(false),
                                version: ev.version.unwrap_or(0),
                            };
                            if let Err(e) = scylla.insert_message(&db_msg).await {
                                error!("Scylla insert error: {:?}", e);
                            } else {
                                info!("Stored message {} from user {}", ev.message_id, ev.user_id);
                            }
                        }
                        Err(e) => error!("JSON parse error: {:?}", e),
                    }
                }

                if let Err(e) = consumer.commit_message(&m, CommitMode::Async) {
                    error!("Commit error: {:?}", e);
                }
            }
            Err(e) => error!("Kafka error: {:?}", e),
        }
    }

    Ok(())
}