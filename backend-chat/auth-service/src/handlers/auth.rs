use axum::{
    extract::Extension,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use headers::{Authorization, HeaderMapExt, authorization::Bearer};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool};
use uuid::Uuid;
use chrono::{Utc, Duration};
use tracing::{info, error};
use crate::utils::hash::{hash_password, verify_password};
use crate::utils::jwt::{create_access_token, decode_token};
use crate::config::Config;
use crate::models::User;
use redis::Commands;
use std::sync::Arc;

use axum::async_trait;
use axum::extract::FromRequestParts;
use axum::http::request::Parts;

#[derive(Serialize, Debug)]
pub struct ErrorResponse {
    error: String,
    details: Option<String>,
}

fn err_json(code: StatusCode, msg: &str, details: Option<String>) -> (StatusCode, Json<ErrorResponse>) {
    (code, Json(ErrorResponse { error: msg.to_string(), details }))
}

pub struct BearerToken(pub String);

#[async_trait]
impl<S> FromRequestParts<S> for BearerToken
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, Json<ErrorResponse>);

    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, Self::Rejection> {
        let token = parts
            .headers
            .typed_get::<Authorization<Bearer>>()
            .ok_or_else(|| err_json(StatusCode::UNAUTHORIZED, "missing bearer token", None))?
            .token()
            .to_string();
        Ok(Self(token))
    }
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: Option<String>,
}

#[derive(Serialize)]
pub struct RegisterResponse {
    pub user_id: Uuid,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub access_expires_at: i64,
    pub refresh_token: String,
}

#[derive(Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Serialize)]
pub struct RefreshResponse {
    pub access_token: String,
    pub access_expires_at: i64,
    pub refresh_token: String,
}

// Модель сессии для Redis
#[derive(Serialize, Deserialize)]
struct RedisSession {
    user_id: Uuid,
    expires_at: i64, // Unix timestamp
}

//
// Handlers
//
pub async fn register(
    Extension(pool): Extension<PgPool>,
    Json(payload): Json<RegisterRequest>,
) -> impl IntoResponse {
    if payload.password.len() < 8 {
        return err_json(StatusCode::BAD_REQUEST, "password too short", None).into_response();
    }

    let hashed = match hash_password(&payload.password) {
        Ok(h) => h,
        Err(e) => {
            error!("hash error: {:?}", e);
            return err_json(StatusCode::INTERNAL_SERVER_ERROR, "hash error", Some(e.to_string())).into_response();
        }
    };

    let user_id = Uuid::new_v4();

    let res = sqlx::query!(
        r#"
        INSERT INTO users (id, email, password_hash, provider, name)
        VALUES ($1, $2, $3, 'local', $4)
        "#,
        user_id,
        payload.email,
        hashed,
        payload.name
    )
    .execute(&pool)
    .await;

    match res {
        Ok(_) => {
            info!(user_id = %user_id, "user created");
            (StatusCode::CREATED, Json(RegisterResponse { user_id })).into_response()
        },
        Err(e) => {
            error!("db insert user error: {:?}", e);
            if let Some(db_err) = e.as_database_error() {
                if db_err.code().map(|c| c == "23505").unwrap_or(false) {
                    return err_json(StatusCode::CONFLICT, "email already exists", None).into_response();
                }
            }
            err_json(StatusCode::INTERNAL_SERVER_ERROR, "db error", Some(e.to_string())).into_response()
        }
    }
}

pub async fn login(
    Extension(pool): Extension<PgPool>,
    Extension(redis): Extension<Arc<redis::Client>>,
    Extension(cfg): Extension<Config>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    let row = match sqlx::query!(
        r#"
        SELECT id, password_hash
        FROM users
        WHERE email = $1 AND is_active = true
        "#,
        payload.email
    )
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return err_json(StatusCode::UNAUTHORIZED, "invalid credentials", None).into_response(),
        Err(e) => return err_json(StatusCode::INTERNAL_SERVER_ERROR, "db error", Some(e.to_string())).into_response(),
    };

    let stored_hash = match row.password_hash {
        Some(h) => h,
        None => return err_json(StatusCode::UNAUTHORIZED, "invalid credentials", None).into_response(),
    };

    if !verify_password(&stored_hash, &payload.password).unwrap_or(false) {
        return err_json(StatusCode::UNAUTHORIZED, "invalid credentials", None).into_response();
    }

    // Create access token
    let (access_token, access_exp) = match create_access_token(&cfg.jwt_access_secret, row.id, cfg.access_token_ttl.as_secs() as i64) {
        Ok(t) => t,
        Err(e) => return err_json(StatusCode::INTERNAL_SERVER_ERROR, "jwt error", Some(e.to_string())).into_response(),
    };

    // Create refresh token
    let refresh_token = Uuid::new_v4().to_string();
    let expires_at = Utc::now() + Duration::from_std(cfg.refresh_token_ttl).unwrap_or_else(|_| Duration::hours(24));
    let expires_at_ts = expires_at.timestamp();

    // Save session to Redis
    let session = RedisSession {
        user_id: row.id,
        expires_at: expires_at_ts,
    };

    let key = format!("refresh_token:{}", refresh_token);
    let value = serde_json::to_string(&session).unwrap();
    let ttl_secs = cfg.refresh_token_ttl.as_secs(); // ← u64, без as usize!

    match redis.get_connection() {
    Ok(mut conn) => {
        let _: () = conn.set_ex(&key, &value, ttl_secs)
            .map_err(|e| {
                error!("Redis set error: {:?}", e);
                err_json(StatusCode::INTERNAL_SERVER_ERROR, "session storage failed", Some(e.to_string()))
            }).expect("REASON");
    },
    Err(e) => {
        error!("Redis connection error: {:?}", e);
        return err_json(StatusCode::INTERNAL_SERVER_ERROR, "session storage failed", Some(e.to_string())).into_response();
    }
}

    info!(user = %row.id, "user logged in");

    (StatusCode::OK, Json(LoginResponse {
        access_token,
        access_expires_at: access_exp,
        refresh_token,
    })).into_response()
}

pub async fn refresh_token(
    Extension(_pool): Extension<PgPool>,
    Extension(redis): Extension<Arc<redis::Client>>,
    Extension(cfg): Extension<Config>,
    Json(payload): Json<RefreshRequest>,
) -> impl IntoResponse {
    let key = format!("refresh_token:{}", payload.refresh_token);

    let session_json: Option<String> = match redis.get_connection() {
        Ok(mut conn) => conn.get(&key).ok(),
        Err(e) => {
            error!("Redis connection error: {:?}", e);
            return err_json(StatusCode::INTERNAL_SERVER_ERROR, "session storage error", Some(e.to_string())).into_response();
        }
    };

    let session: RedisSession = match session_json {
        Some(json) => match serde_json::from_str(&json) {
            Ok(s) => s,
            Err(e) => {
                error!("Redis session parse error: {:?}", e);
                return err_json(StatusCode::UNAUTHORIZED, "invalid session", None).into_response();
            }
        },
        None => return err_json(StatusCode::UNAUTHORIZED, "invalid refresh token", None).into_response(),
    };

    if session.expires_at <= Utc::now().timestamp() {
        // Delete expired token
        if let Ok(mut conn) = redis.get_connection() {
            let _ = conn.del::<&str, ()>(&key);
        }
        return err_json(StatusCode::UNAUTHORIZED, "refresh token expired", None).into_response();
    }

    // Create new access token
    let (access_token, access_exp) = match create_access_token(&cfg.jwt_access_secret, session.user_id, cfg.access_token_ttl.as_secs() as i64) {
        Ok(t) => t,
        Err(e) => return err_json(StatusCode::INTERNAL_SERVER_ERROR, "jwt error", Some(e.to_string())).into_response(),
    };

    // Create new refresh token
    let new_refresh_token = Uuid::new_v4().to_string();
    let new_expires_at = Utc::now() + Duration::from_std(cfg.refresh_token_ttl).unwrap_or_else(|_| Duration::hours(24));
    let new_expires_at_ts = new_expires_at.timestamp();

    let new_session = RedisSession {
        user_id: session.user_id,
        expires_at: new_expires_at_ts,
    };

    let new_key = format!("refresh_token:{}", new_refresh_token);
    let new_value = serde_json::to_string(&new_session).unwrap();
    let ttl_secs = cfg.refresh_token_ttl.as_secs(); // ← u64!

    match redis.get_connection() {
    Ok(mut conn) => {
        // Устанавливаем новый refresh token
        if let Err(e) = conn.set_ex::<&str, &str, ()>(&new_key, &new_value, ttl_secs) {
            error!("Redis set error: {:?}", e);
            return err_json(StatusCode::INTERNAL_SERVER_ERROR, "session storage failed", Some(e.to_string())).into_response();
        }

        // Удаляем старый refresh token (ошибку игнорируем)
        let _: Result<(), _> = conn.del(&key);
    },
    Err(e) => {
        error!("Redis connection error: {:?}", e);
        return err_json(StatusCode::INTERNAL_SERVER_ERROR, "session storage failed", Some(e.to_string())).into_response();
    }

};

    (StatusCode::OK, Json(RefreshResponse {
        access_token,
        access_expires_at: access_exp,
        refresh_token: new_refresh_token,
    })).into_response()
}

pub async fn me(
    Extension(pool): Extension<PgPool>,
    Extension(cfg): Extension<Config>,
    BearerToken(token): BearerToken,
) -> impl IntoResponse {
    let decoded = match decode_token(&cfg.jwt_access_secret, &token) {
        Ok(d) => d,
        Err(e) => return err_json(StatusCode::UNAUTHORIZED, "invalid token", Some(e.to_string())).into_response(),
    };

    let user_id = match Uuid::parse_str(&decoded.claims.sub) {
        Ok(id) => id,
        Err(_) => return err_json(StatusCode::UNAUTHORIZED, "invalid token", None).into_response(),
    };

    let r = match sqlx::query!(
        r#"
        SELECT id, email, provider, provider_id, name, avatar_url, is_active, created_at, updated_at
        FROM users
        WHERE id = $1
        "#,
        user_id
    )
    .fetch_one(&pool)
    .await
    {
        Ok(r) => r,
        Err(e) => return err_json(StatusCode::NOT_FOUND, "user not found", Some(e.to_string())).into_response(),
    };

    let user = User {
        id: r.id,
        email: r.email,
        provider: r.provider,
        provider_id: r.provider_id,
        name: r.name,
        avatar_url: r.avatar_url,
        is_active: r.is_active,
        created_at: r.created_at,
        updated_at: r.updated_at,
    };

    (StatusCode::OK, Json(user)).into_response()
}

#[derive(Serialize)]
pub struct UserSearchResult {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub avatar_url: Option<String>,
}

pub async fn search_users(
    Extension(pool): Extension<PgPool>,
    Extension(cfg): Extension<Config>,
    BearerToken(token): BearerToken,
    query: axum::extract::Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    // Валидация токена
    let decoded = match decode_token(&cfg.jwt_access_secret, &token) {
        Ok(d) => d,
        Err(e) => return err_json(StatusCode::UNAUTHORIZED, "invalid token", Some(e.to_string())).into_response(),
    };

    let current_user_id = match Uuid::parse_str(&decoded.claims.sub) {
        Ok(id) => id,
        Err(_) => return err_json(StatusCode::UNAUTHORIZED, "invalid token", None).into_response(),
    };

    // Получаем поисковый запрос
    let q = query.get("q").map(|s| s.as_str()).unwrap_or("");
    if q.is_empty() {
        return (StatusCode::OK, Json(Vec::<UserSearchResult>::new())).into_response();
    }

    // Защита от слишком коротких запросов
    if q.len() < 2 {
        return (StatusCode::OK, Json(Vec::<UserSearchResult>::new())).into_response();
    }

    // Ищем пользователей (исключая текущего)
    let users = sqlx::query_as!(
        UserSearchResult,
        r#"
        SELECT 
            id, 
            COALESCE(name, email) as "name!",
            email,
            avatar_url
        FROM users 
        WHERE id != $1 
          AND is_active = true
          AND (
            email ILIKE '%' || $2 || '%' 
            OR name ILIKE '%' || $2 || '%'
          )
        ORDER BY 
            CASE WHEN email ILIKE $2 || '%' THEN 0 ELSE 1 END,
            created_at DESC
        LIMIT 20
        "#,
        current_user_id,
        q
    )
    .fetch_all(&pool)
    .await;

    match users {
        Ok(users) => (StatusCode::OK, Json(users)).into_response(),
        Err(e) => {
            error!("search users error: {:?}", e);
            err_json(StatusCode::INTERNAL_SERVER_ERROR, "db error", Some(e.to_string())).into_response()
        }
    }
}