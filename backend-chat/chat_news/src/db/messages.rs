// src/db/messages.rs

use std::collections::HashMap;
use std::sync::Arc;
use scylla::{
    Session, SessionBuilder, IntoTypedRows, prepared_statement::PreparedStatement, 
    Bytes,
};

use uuid::Uuid;
use chrono::{DateTime, Utc};
use anyhow::{Result, Context};
use tracing::debug;
use serde::{Serialize, Deserialize};
use scylla::transport::errors::QueryError;

use crate::models::ChatEvent;


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub chat_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub message_id: Uuid,
    pub user_id: Uuid,
    pub content: Option<String>,
    pub media_urls: Option<Vec<String>>,
    pub media_meta: Option<HashMap<String, String>>,
    pub is_deleted: bool,
    pub deleted_at: Option<DateTime<Utc>>,
    pub edited_at: Option<DateTime<Utc>>,
    pub edited_by: Option<Uuid>,
    pub version: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageEdit {
    pub message_id: Uuid,
    pub edit_id: Uuid,
    pub edited_at: DateTime<Utc>,
    pub editor: Uuid,
    pub old_content: String,           // теперь не Option — всегда есть
    pub new_content: String,           // теперь не Option — всегда есть
    pub meta: Option<HashMap<String, String>>,
}

#[derive(Debug)]
pub enum DeleteError {
    MessageNotFound,
    PermissionDenied,
    InternalError(anyhow::Error),
}

impl From<anyhow::Error> for DeleteError {
    fn from(e: anyhow::Error) -> Self {
        Self::InternalError(e)
    }
}

#[derive(Clone)]
pub struct ScyllaDb {
    pub session: Arc<Session>,
    pub keyspace: String,

    // Вставка
    insert_stmt: PreparedStatement,
    insert_by_id_stmt: PreparedStatement,

    // Чтение
    get_by_chat_stmt: PreparedStatement,
    get_by_id_stmt: PreparedStatement,

    // Редактирование
    update_edit_stmt: PreparedStatement,
    update_edit_by_id_stmt: PreparedStatement,

    // Медиа
    attach_media_stmt: PreparedStatement,
    attach_media_by_id_stmt: PreparedStatement,

    // Удаление
    soft_delete_stmt: PreparedStatement,
    soft_delete_by_id_stmt: PreparedStatement,
    restore_stmt: PreparedStatement,
    restore_by_id_stmt: PreparedStatement,

    // История правок
    insert_edit_stmt: PreparedStatement,
    fetch_edits_stmt: PreparedStatement,

    // Hard delete
    hard_delete_main_stmt: PreparedStatement,
    hard_delete_by_id_stmt: PreparedStatement,
    hard_delete_edits_stmt: PreparedStatement,
    
    // User chats
    get_user_chats_stmt: PreparedStatement,
    check_user_in_chat_stmt: PreparedStatement,

}

#[derive(Debug)]
pub enum ScyllaError {
    Query(QueryError),
    NotFound,
    Other(anyhow::Error),
}

impl From<QueryError> for ScyllaError {
    fn from(e: QueryError) -> Self {
        Self::Query(e)
    }
}

impl From<anyhow::Error> for ScyllaError {
    fn from(e: anyhow::Error) -> Self {
        Self::Other(e)
    }
}

impl Message {
    pub fn from_chat_event(ev: ChatEvent) -> Self {
        let media_meta = match ev.media_meta {
            Some(value) => {
                if value.is_object() {
                    value.as_object()
                        .map(|map| {
                            map.iter()
                                .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                                .collect()
                        })
                        .unwrap_or_default()
                } else {
                    HashMap::new()
                }
            }
            None => HashMap::new(),
        };

        Self {
            chat_id: ev.chat_id,
            created_at: ev.created_at,
            message_id: ev.message_id,
            user_id: ev.user_id,
            content: ev.content,
            media_urls: ev.media_urls,
            media_meta: Some(media_meta),
            is_deleted: ev.is_deleted.unwrap_or(false),
            deleted_at: ev.deleted_at,
            edited_at: ev.edited_at,
            edited_by: ev.edited_by,
            version: ev.version.map(|v| v as i64).unwrap_or(0),
        }
    }
}


impl ScyllaDb {
    pub async fn connect(nodes: &[String], keyspace: &str) -> Result<Self> {
        debug!(nodes = ?nodes, keyspace = %keyspace, "connecting to scylla");

        let session = SessionBuilder::new()
            .known_nodes(nodes.to_vec())
            .use_keyspace(keyspace, false)
            .build()
            .await
            .context("scylla connect")?;

        let arc = Arc::new(session);

        let insert_stmt = arc.prepare(
            "INSERT INTO messages (chat_id, created_at, message_id, user_id, content, media_urls, media_meta, is_deleted, deleted_at, edited_at, edited_by, version) \
            VALUES (?, ?, ?, ?, ?, ?, ?, false, null, null, null, 0)"
        ).await.context("prepare insert")?;

        let insert_by_id_stmt = arc.prepare(
            "INSERT INTO messages_by_id (message_id, chat_id, created_at, user_id, content, media_urls, media_meta, is_deleted, deleted_at, edited_at, edited_by, version) \
            VALUES (?, ?, ?, ?, ?, ?, ?, false, null, null, null, 0)"
        ).await.context("prepare insert_by_id")?;

        let get_by_chat_stmt = arc.prepare(
            "SELECT chat_id, created_at, message_id, user_id, content, media_urls, media_meta, is_deleted, deleted_at, edited_at, edited_by, version \
            FROM messages WHERE chat_id = ? LIMIT ?"
        ).await.context("prepare get_by_chat")?;

        let get_by_id_stmt = arc.prepare(
            "SELECT message_id, chat_id, created_at, user_id, content, media_urls, media_meta, is_deleted, deleted_at, edited_at, edited_by, version \
            FROM messages_by_id WHERE message_id = ?"
        ).await.context("prepare get_by_id")?;

        let update_edit_stmt = arc.prepare(
            "UPDATE messages SET content = ?, edited_at = ?, edited_by = ?, version = ? WHERE chat_id = ? AND created_at = ? AND message_id = ?"
        ).await.context("prepare update_edit")?;

        let update_edit_by_id_stmt = arc.prepare(
            "UPDATE messages_by_id SET content = ?, edited_at = ?, edited_by = ?, version = ? WHERE message_id = ?"
        ).await.context("prepare update_edit_by_id")?;

        let attach_media_stmt = arc.prepare(
            "UPDATE messages SET media_urls = media_urls + ?, media_meta = media_meta + ? WHERE chat_id = ? AND created_at = ? AND message_id = ?"
        ).await.context("prepare attach_media")?;

        let attach_media_by_id_stmt = arc.prepare(
            "UPDATE messages_by_id SET media_urls = media_urls + ?, media_meta = media_meta + ? WHERE message_id = ?"
        ).await.context("prepare attach_media_by_id")?;

        let soft_delete_stmt = arc.prepare(
            "UPDATE messages SET is_deleted = true, deleted_at = ? WHERE chat_id = ? AND created_at = ? AND message_id = ?"
        ).await.context("prepare soft_delete")?;

        let soft_delete_by_id_stmt = arc.prepare(
            "UPDATE messages_by_id SET is_deleted = true, deleted_at = ? WHERE message_id = ?"
        ).await.context("prepare soft_delete_by_id")?;

        let restore_stmt = arc.prepare(
            "UPDATE messages SET is_deleted = false, deleted_at = null WHERE chat_id = ? AND created_at = ? AND message_id = ?"
        ).await.context("prepare restore")?;

        let restore_by_id_stmt = arc.prepare(
            "UPDATE messages_by_id SET is_deleted = false, deleted_at = null WHERE message_id = ?"
        ).await.context("prepare restore_by_id")?;

        let insert_edit_stmt = arc.prepare(
            "INSERT INTO message_edits (message_id, edit_id, edited_at, editor, old_content, new_content, meta) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).await.context("prepare insert_edit")?;

        let fetch_edits_stmt = arc.prepare(
            "SELECT message_id, edit_id, edited_at, editor, old_content, new_content, meta FROM message_edits WHERE message_id = ? LIMIT ?"
        ).await.context("prepare fetch_edits")?;

        let hard_delete_main_stmt = arc.prepare(
            "DELETE FROM messages WHERE chat_id = ? AND created_at = ? AND message_id = ?"
        ).await.context("prepare hard_delete_main")?;

        let hard_delete_by_id_stmt = arc.prepare(
            "DELETE FROM messages_by_id WHERE message_id = ?"
        ).await.context("prepare hard_delete_by_id")?;

        let hard_delete_edits_stmt = arc.prepare(
            "DELETE FROM message_edits WHERE message_id = ?"
        ).await.context("prepare hard_delete_edits")?;
        
                let get_user_chats_stmt = arc.prepare(
            "SELECT chat_id FROM user_chats WHERE user_id = ?"
        ).await.context("prepare get_user_chats_stmt")?;

        let check_user_in_chat_stmt = arc.prepare(
            "SELECT 1 FROM user_chats WHERE user_id = ? AND chat_id = ?"
        ).await.context("prepare check_user_in_chat_stmt")?;

        Ok(Self {
            session: arc,
            keyspace: keyspace.to_string(),

            insert_stmt,
            insert_by_id_stmt,
            get_by_chat_stmt,
            get_by_id_stmt,
            update_edit_stmt,
            update_edit_by_id_stmt,
            attach_media_stmt,
            attach_media_by_id_stmt,
            soft_delete_stmt,
            soft_delete_by_id_stmt,
            restore_stmt,
            restore_by_id_stmt,
            insert_edit_stmt,
            fetch_edits_stmt,
            hard_delete_main_stmt,
            hard_delete_by_id_stmt,
            hard_delete_edits_stmt,
            get_user_chats_stmt,
            check_user_in_chat_stmt,

        })
    }

    pub async fn insert_message(&self, m: &Message) -> Result<()> {
    let media_urls = m.media_urls.clone().unwrap_or_default();
    let media_meta = m.media_meta.clone().unwrap_or_default();

    // Вставка в основную таблицу: messages (chat_id, created_at, message_id, ...)
    self.session
        .execute(
            &self.insert_stmt,
            (
                m.chat_id,
                m.created_at,
                m.message_id,
                m.user_id,
                m.content.as_deref(), // &str или None
                &media_urls,
                &media_meta,
            ),
        )
        .await
        .context("Failed to insert into 'messages' table")?;

    // Вставка в таблицу по message_id: messages_by_id (message_id, chat_id, created_at, ...)
    self.session
        .execute(
            &self.insert_by_id_stmt,
            (
                m.message_id,
                m.chat_id,
                m.created_at,
                m.user_id,
                m.content.as_deref(), // &str или None
                &media_urls,
                &media_meta,
            ),
        )
        .await
        .context("Failed to insert into 'messages_by_id' table")?;

    Ok(())
}



    pub async fn get_message_by_id(&self, message_id: Uuid) -> Result<Option<Message>> {
        let qr = self.session.execute(&self.get_by_id_stmt, (message_id,))
            .await.context("query by id")?;

        if let Some(rows) = qr.rows {
            if !rows.is_empty() {
                let row = rows.into_typed::<(
                    Uuid, Uuid, DateTime<Utc>, Uuid, Option<String>, Option<Vec<String>>, Option<HashMap<String, String>>,
                    Option<bool>, Option<DateTime<Utc>>, Option<DateTime<Utc>>, Option<Uuid>, Option<i64>
                )>().next();

                if let Some(Ok((
                    msg_id, chat_id, created_at, user_id, content, media_urls, media_meta,
                    is_deleted_opt, deleted_at, edited_at, edited_by, version_opt
                ))) = row
                {
                    return Ok(Some(Message {
                        chat_id,
                        created_at,
                        message_id: msg_id,
                        user_id,
                        content,
                        media_urls,
                        media_meta,
                        is_deleted: is_deleted_opt.unwrap_or(false),
                        deleted_at,
                        edited_at,
                        edited_by,
                        version: version_opt.unwrap_or(0),
                    }));
                }
            }
        }

        Ok(None)
    }

    pub async fn fetch_recent_paged(&self, chat_id: Uuid, limit: i32, paging_state: Option<Vec<u8>>) -> Result<(Vec<Message>, Option<Vec<u8>>)> {
        let qr = match paging_state {
            Some(state) => {
                let state = Some(Bytes::from(state));
                self.session.execute_paged(&self.get_by_chat_stmt, (chat_id, limit), state).await?
            }
            None => {
                self.session.execute(&self.get_by_chat_stmt, (chat_id, limit)).await?
            }
        };

        let rows = qr.rows.unwrap_or_default();
        let mut out = Vec::with_capacity(rows.len());

        for row in rows.into_typed::<(
            Uuid, DateTime<Utc>, Uuid, Uuid, Option<String>, Option<Vec<String>>, Option<HashMap<String, String>>,
            Option<bool>, Option<DateTime<Utc>>, Option<DateTime<Utc>>, Option<Uuid>, Option<i64>
        )>() {
            let (chat_id, created_at, message_id, user_id, content, media_urls, media_meta, is_deleted_opt, deleted_at, edited_at, edited_by, version_opt) = row?;
            out.push(Message {
                chat_id,
                created_at,
                message_id,
                user_id,
                content,
                media_urls,
                media_meta,
                is_deleted: is_deleted_opt.unwrap_or(false),
                deleted_at,
                edited_at,
                edited_by,
                version: version_opt.unwrap_or(0),
            });
        }

        Ok((out, qr.paging_state.map(|b| b.to_vec())))
    }

    pub async fn get_message_timestamp(&self, message_id: Uuid) -> Result<Option<(Uuid, DateTime<Utc>)>> {
        let qr = self.session.execute(&self.get_by_id_stmt, (message_id,))
            .await.context("query timestamp by id")?;

        if let Some(rows) = qr.rows {
            for row in rows.into_typed::<(
                Uuid, Uuid, DateTime<Utc>, Uuid, Option<String>, Option<Vec<String>>, Option<HashMap<String, String>>,
                Option<bool>, Option<DateTime<Utc>>, Option<DateTime<Utc>>, Option<Uuid>, Option<i64>
            )>() {
                let (msg_id, chat_id, created_at, _, _, _, _, _, _, _, _, _) = row?;
                if msg_id == message_id {
                    return Ok(Some((chat_id, created_at)));
                }
            }
        }

        Ok(None)
    }

    pub async fn edit_message_with_history(&self, message_id: Uuid, new_content: Option<String>, editor: Uuid) -> Result<()> {
        let msg = self.get_message_by_id(message_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("message not found"))?;

        let old_content = msg.content.clone().unwrap_or_default();
        let new_content = new_content.unwrap_or_default();
        let new_version = msg.version + 1;
        let now = Utc::now();

        if old_content == new_content {
            return Ok(()); // Нет изменений
        }

        let edit = MessageEdit {
            message_id,
            edit_id: Uuid::new_v4(),
            edited_at: now,
            editor,
            old_content,
            new_content: new_content.clone(),
            meta: None,
        };

        self.insert_edit(&edit).await?;

        let (chat_id, created_at) = self.get_message_timestamp(message_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("timestamp not found"))?;

        self.session.execute(&self.update_edit_stmt, (
            new_content.clone(),
            now,
            editor,
            new_version,
            chat_id,
            created_at,
            message_id,
        )).await.context("update edit messages")?;

        self.session.execute(&self.update_edit_by_id_stmt, (
            new_content,
            now,
            editor,
            new_version,
            message_id,
        )).await.context("update edit by id")?;

        Ok(())
    }

    pub async fn attach_media(&self, chat_id: Uuid, created_at: DateTime<Utc>, message_id: Uuid, urls: Vec<String>, meta: HashMap<String, String>) -> Result<()> {
        self.session.execute(&self.attach_media_stmt, (urls.clone(), meta.clone(), chat_id, created_at, message_id))
            .await.context("attach media")?;

        self.session.execute(&self.attach_media_by_id_stmt, (urls, meta, message_id))
            .await.context("attach media by id")?;

        Ok(())
    }

    pub async fn delete_message(
        &self,
        message_id: Uuid,
        requester_user_id: Uuid,
        is_admin: bool,
    ) -> Result<(), DeleteError> {
        let msg = self.get_message_by_id(message_id)
            .await
            .map_err(DeleteError::from)?
            .ok_or(DeleteError::MessageNotFound)?;

        if !is_admin && msg.user_id != requester_user_id {
            return Err(DeleteError::PermissionDenied);
        }

        if msg.is_deleted {
            return Ok(());
        }

        let (chat_id, created_at) = self.get_message_timestamp(message_id)
            .await
            .map_err(DeleteError::from)?
            .ok_or(DeleteError::MessageNotFound)?;

        self.session.execute(&self.soft_delete_stmt, (Utc::now(), chat_id, created_at, message_id))
            .await
            .map_err(|e| DeleteError::from(anyhow::anyhow!(e)));

        self.session.execute(&self.soft_delete_by_id_stmt, (Utc::now(), message_id))
            .await
            .map_err(|e| DeleteError::from(anyhow::anyhow!(e)));

        Ok(())
    }

        pub async fn restore_message(&self, message_id: Uuid, requester_user_id: Uuid, is_admin: bool) -> Result<(), DeleteError> {
        let msg = self.get_message_by_id(message_id)
            .await
            .map_err(DeleteError::from)?
            .ok_or(DeleteError::MessageNotFound)?;

        if !is_admin && msg.user_id != requester_user_id {
            return Err(DeleteError::PermissionDenied);
        }

        if !msg.is_deleted {
            return Ok(()); // Уже не удалено
        }

        let (chat_id, created_at) = self.get_message_timestamp(message_id)
            .await
            .map_err(DeleteError::from)?
            .ok_or(DeleteError::MessageNotFound)?;

        self.session.execute(&self.restore_stmt, (chat_id, created_at, message_id))
            .await
            .map_err(|e| DeleteError::from(anyhow::anyhow!(e)));

        self.session.execute(&self.restore_by_id_stmt, (message_id,))
            .await
            .map_err(|e| DeleteError::from(anyhow::anyhow!(e)));

        Ok(())
    }

        pub async fn hard_delete_message(&self, message_id: Uuid, _requester_user_id: Uuid, is_admin: bool) -> Result<(), DeleteError> {
        if !is_admin {
            return Err(DeleteError::PermissionDenied);
        }

        let (chat_id, created_at) = self.get_message_timestamp(message_id)
            .await
            .map_err(DeleteError::from)?
            .ok_or(DeleteError::MessageNotFound)?;

        // Удаляем из основных таблиц
        self.session.execute(&self.hard_delete_main_stmt, (chat_id, created_at, message_id))
            .await
            .map_err(|e| DeleteError::from(anyhow::anyhow!(e)));

        self.session.execute(&self.hard_delete_by_id_stmt, (message_id,))
            .await
            .map_err(|e| DeleteError::from(anyhow::anyhow!(e)));

        // Удаляем историю правок
        self.session.execute(&self.hard_delete_edits_stmt, (message_id,))
            .await
            .map_err(|e| DeleteError::from(anyhow::anyhow!(e)));

        Ok(())
    }

        pub async fn insert_edit(&self, edit: &MessageEdit) -> Result<()> {
        self.session.execute(&self.insert_edit_stmt, (
            edit.message_id,
            edit.edit_id,
            edit.edited_at,
            edit.editor,
            edit.old_content.clone(),
            edit.new_content.clone(),
            edit.meta.clone(),
        )).await.context("insert edit")?;

        Ok(())
    }

    pub async fn fetch_edits_by_message(&self, message_id: Uuid, limit: i32) -> Result<Vec<MessageEdit>> {
    let qr = self.session
        .execute(&self.fetch_edits_stmt, (message_id, limit))
        .await
        .context("fetch edits query failed")?;

    let mut edits = Vec::new();
    if let Some(rows) = qr.rows {
        for row in rows.into_typed::<(
            Uuid, Uuid, DateTime<Utc>, Uuid, String, String, Option<HashMap<String, String>>
        )>() {
            let (msg_id, edit_id, edited_at, editor, old_content, new_content, meta) = row?;
            edits.push(MessageEdit {
                message_id: msg_id,
                edit_id,
                edited_at,
                editor,
                old_content,
                new_content,
                meta,
            });
        }
    }

    Ok(edits)
}


        pub async fn get_message_with_edits(&self, message_id: Uuid, edit_limit: i32) -> Result<Option<(Message, Vec<MessageEdit>)>> {
        let message = self.get_message_by_id(message_id).await?;
        let edits = match &message {
            Some(_) => self.fetch_edits_by_message(message_id, edit_limit).await?,
            None => return Ok(None),
        };

        Ok(Some((message.unwrap(), edits)))
    }

        /// Получает список chat_id, в которых состоит пользователь
    pub async fn get_user_chat_ids(&self, user_id: Uuid) -> Result<Vec<Uuid>, ScyllaError> {
        let rows = self.session
            .execute(&self.get_user_chats_stmt, (user_id,))
            .await?;

        let mut chat_ids = Vec::new();
        if let Some(row_set) = rows.rows {
            for row in row_set.into_typed::<(Uuid,)>() {
                match row {
                    Ok((chat_id,)) => chat_ids.push(chat_id),
                    Err(e) => return Err(ScyllaError::Other(e.into())),
                }
            }
        }

        Ok(chat_ids)
    }


    /// Проверяет, состоит ли пользователь в чате
    pub async fn is_user_in_chat(&self, chat_id: Uuid, user_id: Uuid) -> Result<bool, ScyllaError> {
        let rows = self.session
            .execute(&self.check_user_in_chat_stmt, (user_id, chat_id))
            .await?;

        Ok(!rows.rows.map(|r| r.is_empty()).unwrap_or(true))
    }

    
}
