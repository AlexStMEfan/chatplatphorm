use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;
use crate::{AppState, models::Message, auth::BearerToken};

pub async fn get_history(
    Path(chat_id): Path<Uuid>,
    State(state): State<AppState>,
    _bearer: BearerToken,
) -> Result<Json<Vec<Message>>, crate::auth::AppError> {
    let history = state.db.get_chat_history(chat_id, 50).await?;
    Ok(Json(history))
}