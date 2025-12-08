use std::env;

#[derive(Clone)]
pub struct Config {
    pub kafka_brokers: String,
    pub chat_service_url: String,
    pub auth_service_url: String,
    pub smtp_host: String,
    pub smtp_user: String,
    pub smtp_pass: String,
    pub firebase_key: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            kafka_brokers: env::var("KAFKA_BROKERS").unwrap_or_else(|_| "localhost:9092".to_string()),
            chat_service_url: env::var("CHAT_SERVICE_URL").expect("CHAT_SERVICE_URL must be set"),
            auth_service_url: env::var("AUTH_SERVICE_URL").expect("AUTH_SERVICE_URL must be set"),
            smtp_host: env::var("SMTP_HOST").expect("SMTP_HOST must be set"),
            smtp_user: env::var("SMTP_USER").expect("SMTP_USER must be set"),
            smtp_pass: env::var("SMTP_PASS").expect("SMTP_PASS must be set"),
            firebase_key: env::var("FIREBASE_KEY").expect("FIREBASE_KEY must be set"),
        }
    }
}