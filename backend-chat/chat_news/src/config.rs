// src/config.rs

use dotenvy::dotenv;
use std::env;
use anyhow::{Context, Result};

#[derive(Clone, Debug)]
pub struct Config {
    // Kafka
    pub kafka_brokers: String,
    pub kafka_chat_topic: String,
    pub kafka_notif_topic: String,

    // Scylla
    pub scylla_nodes: Vec<String>,
    pub scylla_keyspace: String,

    // JWT secrets
    pub jwt_access_secret: String,
    pub jwt_refresh_secret: String,
    pub jwt_secret: String,

    // Token TTL
    pub access_token_ttl: i64,
    pub refresh_token_ttl: i64,

    // HTTP
    pub bind_addr: String,
    pub postgres_url: String, // ✅ Должен быть полным DSN
}

impl Config {
    pub fn from_env() -> Result<Self> {
        dotenv().ok();

        // Kafka
        let kafka_brokers = env::var("KAFKA_BROKERS")
            .unwrap_or_else(|_| "127.0.0.1:9092".into());
        let kafka_chat_topic = env::var("KAFKA_CHAT_TOPIC")
            .unwrap_or_else(|_| "chat_messages".into());
        let kafka_notif_topic = env::var("KAFKA_NOTIF_TOPIC")
            .unwrap_or_else(|_| "notifications".into());

        // Scylla
        let scylla_nodes_raw = env::var("SCYLLA_NODES")
            .unwrap_or_else(|_| "127.0.0.1:9042".into());
        let scylla_nodes = scylla_nodes_raw
            .split(',')
            .map(|s| s.trim().to_string())
            .collect::<Vec<_>>();
        let scylla_keyspace = env::var("SCYLLA_KEYSPACE")
            .unwrap_or_else(|_| "chat".into());

        // JWT
        let jwt_access_secret = env::var("JWT_ACCESS_SECRET")
            .context("Missing JWT_ACCESS_SECRET")?;
        let jwt_refresh_secret = env::var("JWT_REFRESH_SECRET")
            .context("Missing JWT_REFRESH_SECRET")?;
        let jwt_secret = env::var("JWT_SECRET")
            .unwrap_or_else(|_| jwt_access_secret.clone());

        // TTL
        let access_token_ttl = env::var("ACCESS_TOKEN_TTL_SECONDS")
            .unwrap_or_else(|_| "900".into()) // 15 минут
            .parse::<i64>()
            .context("ACCESS_TOKEN_TTL_SECONDS must be integer")?;

        let refresh_token_ttl = env::var("REFRESH_TOKEN_TTL_SECONDS")
            .unwrap_or_else(|_| "2592000".into()) // 30 дней
            .parse::<i64>()
            .context("REFRESH_TOKEN_TTL_SECONDS must be integer")?;

        // HTTP
        let bind_addr = env::var("BIND_ADDR")
            .unwrap_or_else(|_| "127.0.0.1:8081".into());

        // ✅ Исправлено: DATABASE_URL должен быть полным DSN
        let postgres_url = env::var("DATABASE_URL")
            .context("Missing DATABASE_URL. Expected: postgres://user:password@host:port/dbname")?;

        Ok(Self {
            kafka_brokers,
            kafka_chat_topic,
            kafka_notif_topic,
            scylla_nodes,
            scylla_keyspace,
            jwt_access_secret,
            jwt_refresh_secret,
            jwt_secret,
            access_token_ttl,
            refresh_token_ttl,
            bind_addr,
            postgres_url,
        })
    }
}
