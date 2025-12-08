// src/config.rs
use std::time::Duration;
use dotenvy::dotenv;
use std::env;
use anyhow::{Result, Context};
use sqlx::postgres::PgPoolOptions;
use redis::Client as RedisClient;

#[derive(Clone, Debug)]
pub struct Config {
    // Database
    pub database_url: String,
    pub redis_url: String,

    // JWT secrets
    pub jwt_access_secret: String,
    pub jwt_refresh_secret: String,

    // Token TTL
    pub access_token_ttl: Duration,
    pub refresh_token_ttl: Duration,

    // HTTP server
    pub bind_addr: String,

    // Optional SSO providers
    pub google_client_id: Option<String>,
    pub google_client_secret: Option<String>,
    pub yandex_client_id: Option<String>,
    pub yandex_client_secret: Option<String>,
    pub keycloak_url: Option<String>,
    pub keycloak_realm: Option<String>,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        dotenv().ok();

        let database_url = env::var("DATABASE_URL")
            .context("Missing env: DATABASE_URL")?;

        let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into());

        let jwt_access_secret = env::var("JWT_ACCESS_SECRET")
            .context("Missing env: JWT_ACCESS_SECRET")?;

        let jwt_refresh_secret = env::var("JWT_REFRESH_SECRET")
            .context("Missing env: JWT_REFRESH_SECRET")?;

        let access_token_ttl = Self::parse_duration("ACCESS_TOKEN_TTL_SECONDS", 900)?;
        let refresh_token_ttl = Self::parse_duration("REFRESH_TOKEN_TTL_SECONDS", 2_592_000)?; // 30 days

        let bind_addr = env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:8080".into());

        // Optional SSO configs
        let google_client_id = env::var("GOOGLE_CLIENT_ID").ok();
        let google_client_secret = env::var("GOOGLE_CLIENT_SECRET").ok();
        let yandex_client_id = env::var("YANDEX_CLIENT_ID").ok();
        let yandex_client_secret = env::var("YANDEX_CLIENT_SECRET").ok();
        let keycloak_url = env::var("KEYCLOAK_URL").ok();
        let keycloak_realm = env::var("KEYCLOAK_REALM").ok();

        Ok(Self {
            database_url,
            redis_url,
            jwt_access_secret,
            jwt_refresh_secret,
            access_token_ttl: Duration::from_secs(access_token_ttl),
            refresh_token_ttl: Duration::from_secs(refresh_token_ttl),
            bind_addr,
            google_client_id,
            google_client_secret,
            yandex_client_id,
            yandex_client_secret,
            keycloak_url,
            keycloak_realm,
        })
    }

    fn parse_duration(var_name: &str, default: u64) -> Result<u64> {
        let value = env::var(var_name).unwrap_or_else(|_| default.to_string());
        value.parse::<u64>()
            .with_context(|| format!("{} must be a valid integer representing seconds", var_name))
    }

    /// Создать подключение к PostgreSQL через sqlx
    pub async fn init_pg_pool(&self) -> Result<sqlx::PgPool> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .connect(&self.database_url)
            .await
            .context("Failed to connect to PostgreSQL")?;
        tracing::info!("Connected to PostgreSQL at {}", self.database_url);
        Ok(pool)
    }

    /// Создать клиент Redis
    pub fn init_redis_client(&self) -> Result<RedisClient> {
        let client = RedisClient::open(self.redis_url.clone())
            .context("Failed to create Redis client")?;
        tracing::info!("Redis client initialized at {}", self.redis_url);
        Ok(client)
    }
}