// src/main.rs
mod config;
mod models;
mod db;
mod kafka;
mod websocket;
mod jwt;

use axum::{
    Extension, Router, extract::WebSocketUpgrade, middleware::{self, Next},
    response::{IntoResponse, Response}, routing::get,
    http::Request, body::Body,
};
use axum_extra::TypedHeader;
use headers::{Authorization, authorization::Bearer};
use std::sync::Arc;
use tokio::{net::TcpListener, task};
use tracing_subscriber::{FmtSubscriber, EnvFilter};
use anyhow::Result;
use uuid::Uuid;

use crate::{
    config::Config,
    db::messages::ScyllaDb,
    kafka::producer::KafkaProducer,
    websocket::gateway::ws_handler,
    jwt::validate_jwt,
    models::UserUuid,
};

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub scylla: Arc<ScyllaDb>,
    pub kafka_producer: Arc<KafkaProducer>,
}

async fn auth_middleware(
    TypedHeader(auth): TypedHeader<Authorization<Bearer>>,
    Extension(state): Extension<Arc<AppState>>,
    request: Request<Body>,
    next: Next,
) -> Result<Response, (axum::http::StatusCode, &'static str)> {
    let user_id = validate_jwt(&state.config.jwt_secret, auth.token())
        .map_err(|_| (axum::http::StatusCode::UNAUTHORIZED, "Invalid token"))?;

    let (mut parts, body) = request.into_parts();
    parts.extensions.insert(UserUuid(user_id));
    let request = Request::from_parts(parts, body);

    Ok(next.run(request).await)
}

async fn ws_route(
    ws: WebSocketUpgrade,
    TypedHeader(auth): TypedHeader<Authorization<Bearer>>,
    Extension(state): Extension<Arc<AppState>>,
) -> impl IntoResponse {
    let user_id = validate_jwt(&state.config.jwt_secret, auth.token())
        .map_err(|_| (axum::http::StatusCode::UNAUTHORIZED, "Invalid token"))
        .unwrap_or_else(|e| return e.into_response());

    ws_handler(ws, user_id, state).await
}

#[tokio::main]
async fn main() -> Result<()> {
    let subscriber = FmtSubscriber::builder()
        .with_env_filter(EnvFilter::from_default_env())
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    let config = Arc::new(Config::from_env()?);
    tracing::info!("🚀 chat-service starting on {}", config.bind_addr);

    let scylla = Arc::new(ScyllaDb::connect(&config.scylla_nodes, &config.scylla_keyspace).await?);
    let kafka_producer = Arc::new(KafkaProducer::new(&config.kafka_brokers, &config.kafka_chat_topic)?);

    // Запуск Kafka consumer в фоне
    {
        let brokers = config.kafka_brokers.clone();
        let topic = config.kafka_chat_topic.clone();
        let sc = scylla.clone();
        task::spawn(async move {
            if let Err(e) = crate::kafka::consumer::run_consumer(&brokers, &topic, sc).await {
                tracing::error!("Kafka consumer error: {:?}", e);
            }
        });
    }

    let app_state = Arc::new(AppState {
        config: config.clone(),
        scylla,
        kafka_producer,
    });

    let app = Router::new()
        .route("/ws", get(ws_route))
        .route("/health", get(|| async { "OK" }))
        .layer(Extension(app_state))
        .layer(middleware::from_fn(auth_middleware));

    let listener = TcpListener::bind(&config.bind_addr).await?;
    tracing::info!("Server listening on {}", config.bind_addr);
    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}