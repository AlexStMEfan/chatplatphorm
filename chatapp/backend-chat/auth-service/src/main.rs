use axum::{Router, routing::{post, get}};
use tokio::net::TcpListener;
use tracing_subscriber::{EnvFilter};
use sqlx::PgPool;
use redis::Client as RedisClient;
use dotenvy::dotenv;
use std::sync::Arc;
use anyhow::Context;
use crate::config::Config;
use tower_http::cors::{Any, CorsLayer};
use http::header::HeaderValue;

mod config;
mod handlers;
mod utils;
mod models;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

    let cors = CorsLayer::new()
    .allow_origin(vec![
        HeaderValue::from_static("http://localhost:8080"),
        HeaderValue::from_static("https://your-frontend.com"),
    ])
    .allow_methods(Any)
    .allow_headers(Any);

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let cfg = Config::from_env()?;

    // Клонируем URL'ы, чтобы не трогать cfg
    let db_url = cfg.database_url.clone();
    let redis_url = cfg.redis_url.clone();
    let bind_addr = cfg.bind_addr.clone();

    let pool = PgPool::connect(&db_url).await
        .context("Failed to connect to PostgreSQL")?;

    let redis_client = RedisClient::open(redis_url)
        .context("Failed to connect to Redis")?;

    let app = Router::new()
        .route("/register", post(handlers::auth::register))
        .route("/login", post(handlers::auth::login))
        .route("/refresh", post(handlers::auth::refresh_token))
        .route("/me", get(handlers::auth::me))
        .route("/users/search", axum::routing::get(handlers::auth::search_users))
        .layer(cors)
        .layer(axum::extract::Extension(Arc::new(redis_client)))
        .layer(axum::extract::Extension(pool))
        .layer(axum::extract::Extension(cfg));

    let listener = TcpListener::bind(&bind_addr).await?;
    tracing::info!("Server listening on {}", bind_addr);
    axum::serve(listener, app).await?;

    Ok(())
}