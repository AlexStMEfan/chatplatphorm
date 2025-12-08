use axum::extract::ws::{WebSocket, Message as WsMessage};

pub async fn handle_websocket(
    ws: WebSocket,
    user_id: Uuid,
    state: AppState,
) {
    let (mut sender, mut receiver) = ws.split();
    
    // Подписка на чаты пользователя
    let chat_ids = state.db.get_user_chats(user_id).await;
    for chat_id in chat_ids {
        state.kafka_subscriber.subscribe(&format!("chat.{}", chat_id));
    }

    // Отправка непрочитанных сообщений
    let unread = state.db.get_unread_messages(user_id).await;
    for msg in unread {
        sender.send(WsMessage::Text(serde_json::to_string(&msg)?)).await?;
    }

    // Обработка входящих сообщений от клиента
    while let Some(msg) = receiver.next().await {
        if let Ok(WsMessage::Text(text)) = msg {
            // Обработать как команду (например, "read")
        }
    }
}