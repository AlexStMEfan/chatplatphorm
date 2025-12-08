use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: i64,
}

pub fn validate_jwt(secret: &str, token: &str) -> Result<Uuid, AppError> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default(),
    )?;
    
    if token_data.claims.exp < chrono::Utc::now().timestamp() {
        return Err(AppError::InvalidToken);
    }
    
    Uuid::parse_str(&token_data.claims.sub)
        .map_err(|_| AppError::InvalidToken)
}

#[derive(Debug)]
pub enum AppError {
    InvalidToken,
    KafkaError,
    DbError,
}

impl Into<axum::response::Response> for AppError {
    fn into(self) -> axum::response::Response {
        use axum::http::StatusCode;
        match self {
            AppError::InvalidToken => (StatusCode::UNAUTHORIZED, "Invalid token").into(),
            AppError::KafkaError => (StatusCode::INTERNAL_SERVER_ERROR, "Kafka error").into(),
            AppError::DbError => (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into(),
        }
    }
}