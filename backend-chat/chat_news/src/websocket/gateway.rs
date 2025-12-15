// src/websocket/gateway.rs
use axum::extract::ws::WebSocketUpgrade;
use axum::response::Response;
use uuid::Uuid;
use std::sync::Arc;

use crate::{AppState, websocket::handler::handle_websocket};

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    user_id: Uuid,
    state: Arc<AppState>,
) -> Response {
    ws.on_upgrade(|socket| handle_websocket(socket, user_id, state))
}