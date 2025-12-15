use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    response::IntoResponse,
    Json,
};
use headers::{authorization::Bearer, Authorization, HeaderMapExt};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
pub mod middleware;
use crate::config::Config;

//
// ==========================
// JWT TYPES
// ==========================
//

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: Uuid,
    pub exp: i64,
    pub iat: i64,
}

#[derive(Debug, Serialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: &'static str,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub details: Option<String>,
}

fn err(
    code: StatusCode,
    msg: &str,
    details: Option<String>,
) -> (StatusCode, Json<ErrorResponse>) {
    (
        code,
        Json(ErrorResponse {
            error: msg.to_string(),
            details,
        }),
    )
}

//
// ==========================
// 100% TYPE-SAFE create_access_token
// ==========================
//

/// Создаёт JWT Access Token строго типизированным способом.
pub fn create_access_token(
    user_id: Uuid,
    secret: &str,
    duration_seconds: i64,
) -> jsonwebtoken::errors::Result<String> {
    use chrono::Utc;

    let now = Utc::now().timestamp();

    let claims = Claims {
        sub: user_id,
        iat: now,
        exp: now + duration_seconds,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

//
// ==========================
// Extractor: AuthUser(Uuid)
// ==========================
//

pub struct AuthUser(pub Uuid);

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, Json<ErrorResponse>);

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        // Получаем Authorization: Bearer <token>
        let token = parts
            .headers
            .typed_get::<Authorization<Bearer>>()
            .ok_or_else(|| err(StatusCode::UNAUTHORIZED, "missing bearer token", None))?
            .token()
            .to_string();

        // Получаем Config (jwt_secret)
        let cfg = parts
            .extensions
            .get::<Config>()
            .ok_or_else(|| err(StatusCode::INTERNAL_SERVER_ERROR, "config missing", None))?;

        // Декодируем JWT
        let data = decode::<Claims>(
            &token,
            &DecodingKey::from_secret(cfg.jwt_secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|e| err(StatusCode::UNAUTHORIZED, "invalid token", Some(e.to_string())))?;

        Ok(AuthUser(data.claims.sub))
    }
}

//
// ==========================
// Error → Response
// ==========================
//

impl IntoResponse for ErrorResponse {
    fn into_response(self) -> axum::response::Response {
        (StatusCode::BAD_REQUEST, Json(self)).into_response()
    }
}