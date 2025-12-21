use anyhow::{Result, Context};
use jsonwebtoken::{EncodingKey, DecodingKey, Header, Validation, encode, decode, TokenData};
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use chrono::{Utc};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // store UUID as string
    pub exp: i64,
    pub iat: i64,
}

pub fn create_access_token(secret: &str, user_id: Uuid, ttl_seconds: i64) -> Result<(String, i64)> {
    let now = Utc::now().timestamp();
    let exp = now + ttl_seconds;
    let claims = Claims {
        sub: user_id.to_string(),
        exp,
        iat: now,
    };
    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))
        .context("failed to encode jwt")?;
    Ok((token, exp))
}

pub fn decode_token(secret: &str, token: &str) -> Result<TokenData<Claims>> {
    let validation = Validation::default();
    let data = decode::<Claims>(token, &DecodingKey::from_secret(secret.as_bytes()), &validation)
        .context("failed to decode jwt")?;
    Ok(data)
}