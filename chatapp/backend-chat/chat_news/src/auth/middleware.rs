use axum::{
    async_trait,
    http::StatusCode,
    middleware::Next,
    response::IntoResponse,
    RequestPartsExt,
    Extension, Json,
};
use crate::config::Config;
use crate::auth::auth::{AuthUser, ErrorResponse};
use std::sync::Arc;

//
// ==========================
// AuthState
// ==========================
pub struct AuthState {
    pub config: Arc<Config>,
}

impl AuthState {
    pub fn new(config: Arc<Config>) -> Self {
        Self { config }
    }
}

//
// ==========================
// Middleware: sliding_session
// ==========================
pub async fn sliding_session<B>(
    req: axum::http::Request<B>,
    next: Next<B>,
    state: Extension<Arc<AuthState>>,
) -> impl IntoResponse {
    // Здесь можно проверять JWT, обновлять сессию и т.п.
    // Пока просто пропускаем
    next.run(req).await
}