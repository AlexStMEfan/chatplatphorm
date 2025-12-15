use jsonwebtoken::{decode, DecodingKey, Validation, errors::{Error as JwtError, ErrorKind}};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
struct Claims {
    sub: String,
}

pub fn validate_jwt(secret: &str, token: &str) -> Result<Uuid, JwtError> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default(),
    )?;
    
    Uuid::parse_str(&token_data.claims.sub)
        .map_err(|_| JwtError::new(ErrorKind::InvalidToken))
}