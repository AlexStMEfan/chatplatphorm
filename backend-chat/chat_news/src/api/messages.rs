use axum::{
    extract::{State, Json},
    response::IntoResponse,
};
use uuid::Uuid;
use crate::{
    AppState, 
    models::{SendMessageRequest, SendMessageResponse, Message}, 
    auth::get_user_id_from_jwt,
    auth::BearerToken,
    models::ErrorResponse,
};
use axum::http::StatusCode;

pub async fn send_message(
    State(state): State<AppState>,
    bearer_token: BearerToken,
    Json(payload): Json<SendMessageRequest>,
) -> Result<Json<SendMessageResponse>, impl IntoResponse> {
    let user_id = get_user_id_from_jwt(&state.config.jwt_secret, &bearer_token.0)
        .map_err(|e| (StatusCode::UNAUTHORIZED, Json(ErrorResponse { error: e.to_string() })))?;
    
    let message = Message {
        chat_id: payload.chat_id,
        message_id: Uuid::new_v4(),
        user_id,
        content: payload.content,
        created_at: chrono::Utc::now(),
    };
    
    // Публикуем в Kafka и возвращаем сразу
    state.kafka_producer
        .send(&message)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Kafka error".to_string() })))?;
    
    Ok(Json(SendMessageResponse { message_id: message.message_id }))
}