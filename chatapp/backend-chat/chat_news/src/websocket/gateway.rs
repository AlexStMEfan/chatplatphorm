// src/websocket/gateway.rs

use axum::response::Response;
use axum::extract::ws::WebSocketUpgrade;
use uuid::Uuid;
use std::sync::Arc;
use crate::AppState;

use crate::websocket::handler::handle_websocket; 

/// Обработчик HTTP-апгрейда до WebSocket
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    user_id: Uuid,
    state: Arc<AppState>,
) -> Response {
    ws.on_upgrade(move |socket| {
        handle_websocket(socket, user_id, state)
    })
}
