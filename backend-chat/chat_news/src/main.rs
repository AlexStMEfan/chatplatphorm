// src/main.rs
mod config;
mod models;
mod db;
mod kafka;
mod websocket;
mod jwt;

use axum::{
    Extension, Router, extract::WebSocketUpgrade, http::{HeaderMap, StatusCode}, response::IntoResponse, routing::get, serve
};
use std::sync::Arc;
use tokio::{net::TcpListener, task};
use tracing_subscriber::{FmtSubscriber, EnvFilter};
use anyhow::Result;

use crate::{
    config::Config,
    db::messages::ScyllaDb,
    kafka::producer::KafkaProducer,
    websocket::{gateway::ws_handler, manager::ConnectionManager},
    jwt::validate_jwt,
};

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub scylla: Arc<ScyllaDb>,
    pub kafka_producer: Arc<KafkaProducer>,
    pub ws_manager: Arc<ConnectionManager>,
}

async fn ws_route(
    ws: WebSocketUpgrade,
    headers: HeaderMap,
    Extension(state): Extension<Arc<AppState>>,
) -> impl IntoResponse {
    let auth_header = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .ok_or((StatusCode::UNAUTHORIZED, "Missing token"));

    let user_id = match auth_header {
        Ok(token) => match validate_jwt(&state.config.jwt_secret, token) {
            Ok(id) => id,
            Err(_) => return (StatusCode::UNAUTHORIZED, "Invalid token").into_response(),
        },
        Err(e) => return e.into_response(),
    };

    ws_handler(ws, user_id, state).await
}

#[tokio::main]
async fn main() -> Result<()> {
    let subscriber = FmtSubscriber::builder()
        .with_env_filter(EnvFilter::from_default_env())
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    let config = Arc::new(Config::from_env()?);
    let scylla = Arc::new(ScyllaDb::connect(&config.scylla_nodes, &config.scylla_keyspace).await?);
    let kafka_producer = Arc::new(KafkaProducer::new(&config.kafka_brokers, &config.kafka_chat_topic)?);
    let ws_manager = Arc::new(ConnectionManager::new());

    {
        let brokers = config.kafka_brokers.clone();
        let topic = config.kafka_chat_topic.clone();
        let sc = scylla.clone();
        let manager = ws_manager.clone();
        task::spawn(async move {
            if let Err(e) = crate::kafka::consumer::run_consumer(&brokers, &topic, sc, manager).await {
                tracing::error!("Kafka consumer error: {:?}", e);
            }
        });
    }

    let app_state = Arc::new(AppState {
        config: config.clone(),
        scylla,
        kafka_producer,
        ws_manager,
    });

    let app = Router::new()
        .route("/ws", get(ws_route))
        .route("/health", get(|| async { "OK" }))
        .layer(Extension(app_state));

    let listener = TcpListener::bind(&config.bind_addr).await?;
    tracing::info!("Server listening on {}", config.bind_addr);
    serve(listener, app); // ← Без .await

    Ok(())
}