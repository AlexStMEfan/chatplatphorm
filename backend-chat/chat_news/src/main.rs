use axum::Router;
use tokio;
use tracing_subscriber;

mod config;
mod models;
mod kafka;
mod user;
mod notify;

use config::Config;
use kafka::consumer::NotificationConsumer;
use user::status::UserStatusClient;
use notify::{email::EmailService, push::PushService};
use rdkafka::consumer::{BaseConsumer, ConsumerConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    
    let config = Config::from_env();
    
    // Kafka consumer
    let mut kafka_config = ConsumerConfig::new();
    kafka_config.set("bootstrap.servers", &config.kafka_brokers);
    kafka_config.set("group.id", "notification-service");
    kafka_config.set("enable.auto.commit", "true");
    let consumer: BaseConsumer = kafka_config.create()?;
    consumer.subscribe(&["chat.messages"])?;
    
    // Сервисы
    let user_client = UserStatusClient::new(config.chat_service_url);
    let email_service = EmailService::new(config.smtp_host, config.smtp_user, config.smtp_pass);
    let push_service = PushService::new(config.firebase_key);
    
    let notification_consumer = kafka::consumer::NotificationConsumer::new(&config.kafka_brokers)?;
    
    tracing::info!("Notification Service started");
    notification_consumer.start().await;
}