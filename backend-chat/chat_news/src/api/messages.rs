// src/api/messages.rs
use axum::{
    extract::{Path, Query, Extension},
    Json, http::StatusCode, response::IntoResponse, routing::{get, post, put, delete}, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;
use base64::{engine::general_purpose, Engine as _};
use crate::db::messages::{ScyllaDb, Message, MessageEdit};
use crate::auth::AuthUser; // экстрактор, возвращающий AuthUser(Uuid)
use chrono::Utc;
use anyhow::Result;

#[derive(Deserialize)]
pub struct CreateMessageRequest {
    pub content: Option<String>,
    pub media_urls: Option<Vec<String>>,
    pub media_meta: Option<std::collections::HashMap<String,String>>,
}

#[derive(Serialize)]
pub struct CreateMessageResponse {
    pub message_id: Uuid,
    pub created_at: i64,
}

#[derive(Deserialize)]
pub struct FetchQuery {
    pub limit: Option<i32>,
    pub paging_state: Option<String>, // base64
}

#[derive(Serialize)]
pub struct PagedMessages {
    pub messages: Vec<Message>,
    pub next_paging_state: Option<String>, // base64
}

#[derive(Deserialize)]
pub struct EditMessageRequest {
    pub new_content: Option<String>,
}

#[derive(Deserialize)]
pub struct AttachMediaRequest {
    pub media_urls: Vec<String>,
    pub media_meta: Option<std::collections::HashMap<String,String>>,
}

pub fn router() -> Router {
    Router::new()
        .route("/chats/:chat_id/messages", post(create_message))
        .route("/chats/:chat_id/messages", get(fetch_messages))
        .route("/messages/:message_id", put(edit_message))
        .route("/messages/:message_id", delete(delete_message))
        .route("/messages/:message_id/media", post(attach_media))
        .route("/messages/:message_id/edits", get(get_edits))
}

/// POST /chats/:chat_id/messages
async fn create_message(
    Extension(db): Extension<Arc<ScyllaDb>>,
    Path(chat_id): Path<Uuid>,
    Json(payload): Json<CreateMessageRequest>,
    AuthUser(user_id): AuthUser,
) -> impl IntoResponse {
    let msg = Message {
        chat_id,
        created_at: Utc::now(),
        message_id: Uuid::new_v4(),
        user_id,
        content: payload.content,
        media_urls: payload.media_urls,
        media_meta: payload.media_meta,
        is_deleted: false,
        deleted_at: None,
        edited_at: None,
        edited_by: None,
        version: 0,
    };
    if let Err(e) = db.insert_message(&msg).await {
        tracing::error!("insert_message error: {:?}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error":"db error"}))).into_response();
    }
    (StatusCode::CREATED, Json(CreateMessageResponse { message_id: msg.message_id, created_at: msg.created_at.timestamp() })).into_response()
}

/// GET /chats/:chat_id/messages?limit=50&paging_state=base64
async fn fetch_messages(
    Extension(db): Extension<Arc<ScyllaDb>>,
    Path(chat_id): Path<Uuid>,
    Query(q): Query<FetchQuery>,
) -> impl IntoResponse {
    let limit = q.limit.unwrap_or(50).min(200);
    let paging_state = q.paging_state.and_then(|s| general_purpose::STANDARD.decode(s).ok());
    match db.fetch_recent_paged(chat_id, limit, paging_state).await {
        Ok((msgs, next)) => {
            let next_b64 = next.map(|b| general_purpose::STANDARD.encode(&b));
            (StatusCode::OK, Json(PagedMessages { messages: msgs, next_paging_state: next_b64 })).into_response()
        }
        Err(e) => {
            tracing::error!("fetch_recent_paged error: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error":"db error"}))).into_response()
        }
    }
}

/// PUT /messages/:message_id
async fn edit_message(
    Extension(db): Extension<Arc<ScyllaDb>>,
    Path(message_id): Path<Uuid>,
    Json(payload): Json<EditMessageRequest>,
    AuthUser(editor): AuthUser,
) -> impl IntoResponse {
    if let Err(e) = db.edit_message_with_history(message_id, payload.new_content.clone(), editor).await {
        tracing::error!("edit_message error: {:?}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error":"db error"}))).into_response();
    }
    StatusCode::NO_CONTENT.into_response()
}

/// DELETE /messages/:message_id  (soft delete)
async fn delete_message(
    Extension(db): Extension<Arc<ScyllaDb>>,
    Path(message_id): Path<Uuid>,
    AuthUser(_user): AuthUser,
) -> impl IntoResponse {
    // fetch message to obtain chat_id and created_at
    match db.get_message_by_id(message_id).await {
        Ok(Some(msg)) => {
            if let Err(e) = db.soft_delete_message(msg.chat_id, msg.created_at, message_id).await {
                tracing::error!("soft_delete error: {:?}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error":"db error"}))).into_response();
            }
            StatusCode::NO_CONTENT.into_response()
        }
        Ok(None) => (StatusCode::NOT_FOUND, Json(serde_json::json!({"error":"not found"}))).into_response(),
        Err(e) => {
            tracing::error!("get_message_by_id error: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error":"db error"}))).into_response()
        }
    }
}

/// POST /messages/:message_id/media
async fn attach_media(
    Extension(db): Extension<Arc<ScyllaDb>>,
    Path(message_id): Path<Uuid>,
    Json(payload): Json<AttachMediaRequest>,
    AuthUser(_user): AuthUser,
) -> impl IntoResponse {
    // Need chat_id + created_at -> get message
    match db.get_message_by_id(message_id).await {
        Ok(Some(msg)) => {
            let meta = payload.media_meta.unwrap_or_default();
            if let Err(e) = db.attach_media(msg.chat_id, msg.created_at, message_id, payload.media_urls.clone(), meta).await {
                tracing::error!("attach_media error: {:?}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error":"db error"}))).into_response();
            }
            StatusCode::NO_CONTENT.into_response()
        }
        Ok(None) => (StatusCode::NOT_FOUND, Json(serde_json::json!({"error":"not found"}))).into_response(),
        Err(e) => {
            tracing::error!("get_message_by_id error: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error":"db error"}))).into_response()
        }
    }
}

/// GET /messages/:message_id/edits?limit=20
async fn get_edits(
    Extension(db): Extension<Arc<ScyllaDb>>,
    Path(message_id): Path<Uuid>,
    Query(q): Query<Option<FetchQuery>>,
) -> impl IntoResponse {
    let limit = q.and_then(|qq| qq.limit).unwrap_or(50).min(500);
    match db.fetch_edits_by_message(message_id, limit).await {
        Ok(edits) => (StatusCode::OK, Json(edits)).into_response(),
        Err(e) => {
            tracing::error!("fetch_edits_by_message error: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error":"db error"}))).into_response()
        }
    }
}