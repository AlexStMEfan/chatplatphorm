// src/auth.rs

use axum::{
    async_trait,
    extract::{FromRequestParts, State},
    http::request::Parts,
    Json,
    response::{IntoResponse, Response},
};
use headers::{authorization::Bearer, Authorization, HeaderMapExt};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use sha2::{Sha256, Digest}; // ✅ Оставлены: вдруг будут использоваться позже
use std::sync::Arc;

use crate::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: Uuid,
    pub sid: Uuid,
    pub exp: i64,
    pub iat: i64,
}

#[derive(Debug, Serialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: &'static str,
    pub expires_in: i64,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub details: Option<String>,
}

impl IntoResponse for ErrorResponse {
    fn into_response(self) -> Response {
        (axum::http::StatusCode::UNAUTHORIZED, Json(self)).into_response()
    }
}

fn err(msg: &str, details: Option<String>) -> ErrorResponse {
    ErrorResponse {
        error: msg.to_string(),
        details,
    }
}

pub fn create_access_token(
    user_id: Uuid,
    session_id: Uuid,
    secret: &str,
    duration_seconds: i64,
) -> jsonwebtoken::errors::Result<String> {
    use chrono::Utc;

    let now = Utc::now().timestamp();
    let claims = Claims {
        sub: user_id,
        sid: session_id,
        iat: now,
        exp: now + duration_seconds,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

#[derive(Debug, Serialize, Clone)]
pub struct CurrentUser {
    pub id: Uuid,
    pub email: String,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
}

pub struct AuthUser(pub CurrentUser);

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = ErrorResponse;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        let token = parts
            .headers
            .typed_get::<Authorization<Bearer>>()
            .ok_or_else(|| err("missing bearer token", None))?
            .token()
            .to_string();

        let app_state = parts
            .extensions
            .get::<Arc<AppState>>()
            .ok_or_else(|| err("app_state missing", None))?;

        let mut validation = Validation::new(jsonwebtoken::Algorithm::HS256);
        validation.validate_exp = true;

        let data = decode::<Claims>(
            &token,
            &DecodingKey::from_secret(app_state.config.jwt_secret.as_bytes()),
            &validation,
        )
        .map_err(|e| err("invalid token", Some(e.to_string())))?;

        let user_id = data.claims.sub;
        let session_id = data.claims.sid;

        let session = sqlx::query!(
            r#"
            SELECT user_id FROM sessions
            WHERE id = $1 AND user_id = $2 AND expires_at > NOW()
            "#,
            session_id,
            user_id
        )
        .fetch_optional(&app_state.postgres_pool)
        .await
        .map_err(|_| err("database error", None))?;

        if session.is_none() {
            return Err(err("session not found or expired", None));
        }

        let user = sqlx::query!(
            r#"
            SELECT id, email, name, avatar_url, is_active
            FROM users
            WHERE id = $1 AND is_active = TRUE
            "#,
            user_id
        )
        .fetch_optional(&app_state.postgres_pool)
        .await
        .map_err(|_| err("database error", None))?;

        let user = user.ok_or_else(|| err("user not found or inactive", None))?;

        let current_user = CurrentUser {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar_url: user.avatar_url,
        };

        Ok(AuthUser(current_user))
    }
}
