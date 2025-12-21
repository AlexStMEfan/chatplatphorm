use axum::Router;

pub mod messages;
pub mod chats;

pub fn api_routes() -> Router {
    Router::new()
        .route("/messages", axum::routing::post(messages::send_message))
        .route("/chats/:id/history", axum::routing::get(chats::get_history))
}