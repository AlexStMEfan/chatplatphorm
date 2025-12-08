use super::Db;
use crate::models::Message;
use scylla::IntoTypedRows;
use uuid::Uuid;

impl Db {
    pub async fn insert_message(&self, message: &Message) -> Result<(), crate::auth::AppError> {
        self.session
            .query(
                "INSERT INTO chat.messages (chat_id, message_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)",
                (&message.chat_at, &message.message_id, &message.user_id, &message.content, &message.created_at),
            )
            .await
            .map_err(|_| crate::auth::AppError::DbError)?;
        Ok(())
    }

    pub async fn get_chat_history(&self, chat_id: Uuid, limit: i32) -> Result<Vec<Message>, crate::auth::AppError> {
        let rows = self.session
            .query(
                "SELECT chat_id, message_id, user_id, content, created_at FROM chat.messages WHERE chat_id = ? LIMIT ?",
                (&chat_id, limit),
            )
            .await
            .map_err(|_| crate::auth::AppError::DbError)?
            .rows_typed::<(Uuid, Uuid, Uuid, String, chrono::DateTime<chrono::Utc>)>()
            .map_err(|_| crate::auth::AppError::DbError)?;

        let mut messages = Vec::new();
        for row in rows {
            let (chat_id, message_id, user_id, content, created_at) = row.map_err(|_| crate::auth::AppError::DbError)?;
            messages.push(Message { chat_id, message_id, user_id, content, created_at });
        }
        Ok(messages)
    }
}