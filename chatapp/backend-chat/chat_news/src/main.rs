// src/main.rs

mod config;
mod models;
mod db;
mod kafka;
mod websocket;
mod auth;

use axum::{
    Router,
    routing::get,
    response::IntoResponse,
    extract::{State, WebSocketUpgrade},
    Extension,
};
use std::sync::Arc;
use tokio::{net::TcpListener, task};
use tracing_subscriber::{FmtSubscriber, EnvFilter};
use anyhow::Result;
use sqlx::PgPool;

// Импорты из ваших модулей
use crate::{
    config::Config,
    db::ScyllaDb,
    kafka::producer::KafkaProducer,
    websocket::gateway::ws_handler,
    auth::AuthUser,
};

/// Глобальное состояние приложения
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub scylla: Arc<ScyllaDb>,
    pub kafka_producer: Arc<KafkaProducer>,
    pub ws_manager: Arc<websocket::manager::ConnectionManager>,
    pub postgres_pool: PgPool,
}

/// Обработчик WebSocket-подключения
async fn ws_route(
    ws: WebSocketUpgrade,
    user: AuthUser,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws_handler(ws, user.0.id, state).await
}

/// Точка входа
#[tokio::main]
async fn main() -> Result<()> {
    // Инициализация логирования
    let subscriber = FmtSubscriber::builder()
        .with_env_filter(EnvFilter::from_default_env())
        .with_line_number(true)
        .with_file(true)
        .finish();

    tracing::subscriber::set_global_default(subscriber)
        .expect("Failed to set tracing subscriber");

    tracing::info!("🚀 Starting chat service...");

    // Загружаем конфигурацию
    let config = Arc::new(Config::from_env()?);
    tracing::info!("✅ Configuration loaded");

    // Подключаемся к ScyllaDB
    let scylla = Arc::new(
        ScyllaDb::connect(&config.scylla_nodes, &config.scylla_keyspace).await?
    );
    tracing::info!("✅ Connected to ScyllaDB");

    // Подключаемся к PostgreSQL
    let postgres_pool = PgPool::connect(&config.postgres_url).await?;
    tracing::info!("✅ Connected to PostgreSQL");

    // Создаём Kafka Producer
    let kafka_producer = Arc::new(
        KafkaProducer::new(&config.kafka_brokers, &config.kafka_chat_topic)?
    );
    tracing::info!("✅ Kafka producer created");

    // Создаём WebSocket Connection Manager
    let ws_manager = Arc::new(websocket::manager::ConnectionManager::new());
    tracing::info!("✅ WebSocket manager initialized");

    // Создаём общее состояние приложения
    let app_state = Arc::new(AppState {
        config: config.clone(),
        scylla: scylla.clone(),
        kafka_producer: kafka_producer.clone(),
        ws_manager: ws_manager.clone(),
        postgres_pool: postgres_pool.clone(),
    });

    // Запускаем Kafka Consumer в фоне
    {
        let brokers = config.kafka_brokers.clone();
        let topic = config.kafka_chat_topic.clone();
        let scylla_ref = scylla.clone();
        let ws_manager_ref = ws_manager.clone();

        task::spawn(async move {
            tracing::info!("📦 Starting Kafka consumer for topic '{}'", topic);
            if let Err(e) = kafka::consumer::run_consumer(
                &brokers,
                &topic,
                scylla_ref,
                ws_manager_ref,
            ).await {
                tracing::error!("💀 Kafka consumer crashed: {:?}", e);
            }
        });
    }

    // Строим роутер
    let app = Router::new()
        .route("/ws", get(ws_route))
        .route("/health", get(|| async { "OK" }))
        .with_state(app_state.clone())
        // Extension остаётся для совместимости, если используется где-то ещё
        .layer(Extension(app_state.clone()));

    // Запускаем сервер
    let listener = TcpListener::bind(&config.bind_addr).await?;
    let addr = listener.local_addr()?;
    tracing::info!("👂 Server listening on {}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}
