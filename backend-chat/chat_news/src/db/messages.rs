// src/db/messages.rs
use std::collections::HashMap;
use std::sync::Arc;
use scylla::{Session, SessionBuilder, IntoTypedRows, prepared_statement::PreparedStatement, Bytes};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use anyhow::{Result, Context};
use tracing::debug;
use serde::{Serialize, Deserialize};

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
    pub old_content: Option<String>,
    pub new_content: Option<String>,
    pub meta: Option<HashMap<String, String>>,
}

#[derive(Clone)]
pub struct ScyllaDb {
    pub session: Arc<Session>,
    pub keyspace: String,

    insert_stmt: PreparedStatement,
    insert_by_id_stmt: PreparedStatement,
    get_by_chat_stmt: PreparedStatement,
    get_by_id_stmt: PreparedStatement,
    update_edit_stmt: PreparedStatement,
    update_edit_by_id_stmt: PreparedStatement,
    attach_media_stmt: PreparedStatement,
    soft_delete_stmt: PreparedStatement,

    insert_edit_stmt: PreparedStatement,
    fetch_edits_stmt: PreparedStatement,
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

        let soft_delete_stmt = arc.prepare(
            "UPDATE messages SET is_deleted = true, deleted_at = ? WHERE chat_id = ? AND created_at = ? AND message_id = ?"
        ).await.context("prepare soft_delete")?;

        let insert_edit_stmt = arc.prepare(
            "INSERT INTO message_edits (message_id, edit_id, edited_at, editor, old_content, new_content, meta) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).await.context("prepare insert_edit")?;

        let fetch_edits_stmt = arc.prepare(
            "SELECT message_id, edit_id, edited_at, editor, old_content, new_content, meta FROM message_edits WHERE message_id = ? LIMIT ?"
        ).await.context("prepare fetch_edits")?;

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
            soft_delete_stmt,

            insert_edit_stmt,
            fetch_edits_stmt,
        })
    }

    pub async fn insert_message(&self, m: &Message) -> Result<()> {
        let media_urls = m.media_urls.clone().unwrap_or_default();
        let media_meta = m.media_meta.clone().unwrap_or_default();

        self.session.execute(&self.insert_stmt, (
            m.chat_id,
            m.created_at,
            m.message_id,
            m.user_id,
            m.content.clone(),
            media_urls.clone(),
            media_meta.clone()
        )).await.context("insert messages table")?;

        self.session.execute(&self.insert_by_id_stmt, (
            m.message_id,
            m.chat_id,
            m.created_at,
            m.user_id,
            m.content.clone(),
            media_urls,
            media_meta
        )).await.context("insert messages_by_id")?;

        Ok(())
    }

    pub async fn get_message_by_id(&self, message_id: Uuid) -> Result<Option<Message>> {
        let qr = self.session.execute(&self.get_by_id_stmt, (message_id,))
            .await.context("query by id")?;
        if let Some(rows) = qr.rows {
            if rows.is_empty() { return Ok(None); }
            let mut iter = rows.into_typed::<(
                Uuid, Uuid, DateTime<Utc>, Uuid, Option<String>, Option<Vec<String>>, Option<HashMap<String, String>>,
                Option<bool>, Option<DateTime<Utc>>, Option<DateTime<Utc>>, Option<Uuid>, Option<i64>
            )>();
            if let Some(row_res) = iter.next() {
                let (msg_id, chat_id, created_at, user_id, content, media_urls, media_meta, is_deleted_opt, deleted_at, edited_at, edited_by, version_opt) = row_res?;
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
        let iter = rows.into_typed::<(
            Uuid, DateTime<Utc>, Uuid, Uuid, Option<String>, Option<Vec<String>>, Option<HashMap<String,String>>,
            Option<bool>, Option<DateTime<Utc>>, Option<DateTime<Utc>>, Option<Uuid>, Option<i64>
        )>();

        for row in iter {
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

    pub async fn insert_edit(&self, edit: &MessageEdit) -> Result<()> {
        self.session.execute(&self.insert_edit_stmt, (
            edit.message_id,
            edit.edit_id,
            edit.edited_at,
            edit.editor,
            edit.old_content.clone(),
            edit.new_content.clone(),
            edit.meta.clone()
        )).await.context("insert edit")?;
        Ok(())
    }

    pub async fn fetch_edits_by_message(&self, message_id: Uuid, limit: i32) -> Result<Vec<MessageEdit>> {
        let qr = self.session.execute(&self.fetch_edits_stmt, (message_id, limit))
            .await.context("fetch edits")?;
        let rows = qr.rows.unwrap_or_default();
        let mut ret = Vec::with_capacity(rows.len());
        let iter = rows.into_typed::<(Uuid, Uuid, DateTime<Utc>, Uuid, Option<String>, Option<String>, Option<HashMap<String,String>>)>();
        for row in iter {
            let (message_id, edit_id, edited_at, editor, old_content, new_content, meta) = row?;
            ret.push(MessageEdit {
                message_id,
                edit_id,
                edited_at,
                editor,
                old_content,
                new_content,
                meta,
            });
        }
        Ok(ret)
    }

    pub async fn edit_message_with_history(&self, message_id: Uuid, new_content: Option<String>, editor: Uuid) -> Result<()> {
        let msg = self.get_message_by_id(message_id).await?
            .ok_or_else(|| anyhow::anyhow!("message not found"))?;

        let old_content = msg.content.clone();
        let new_version = msg.version + 1;
        let now = Utc::now();

        let edit = MessageEdit {
            message_id,
            edit_id: Uuid::new_v4(),
            edited_at: now,
            editor,
            old_content: old_content.clone(),
            new_content: new_content.clone(),
            meta: None,
        };
        self.insert_edit(&edit).await?;

        self.session.execute(&self.update_edit_stmt, (
            new_content.clone(),
            now,
            editor,
            new_version,
            msg.chat_id,
            msg.created_at,
            message_id
        )).await.context("update edit messages")?;

        self.session.execute(&self.update_edit_by_id_stmt, (
            new_content,
            now,
            editor,
            new_version,
            message_id
        )).await.context("update edit by id")?;

        Ok(())
    }

    pub async fn attach_media(&self, chat_id: Uuid, created_at: DateTime<Utc>, message_id: Uuid, urls: Vec<String>, meta: HashMap<String,String>) -> Result<()> {
        self.session.execute(&self.attach_media_stmt, (urls.clone(), meta.clone(), chat_id, created_at, message_id))
            .await.context("attach media")?;

        let attach_by_id = "UPDATE messages_by_id SET media_urls = media_urls + ?, media_meta = media_meta + ? WHERE message_id = ?";
        let prepared = self.session.prepare(attach_by_id).await?;
        self.session.execute(&prepared, (urls, meta, message_id)).await.context("attach_by_id")?;
        Ok(())
    }

    pub async fn soft_delete_message(&self, chat_id: Uuid, created_at: DateTime<Utc>, message_id: Uuid) -> Result<()> {
        let now = Utc::now();
        self.session.execute(&self.soft_delete_stmt, (now, chat_id, created_at, message_id))
            .await.context("soft_delete")?;

        let soft_by_id = "UPDATE messages_by_id SET is_deleted = true, deleted_at = ? WHERE message_id = ?";
        let prepared = self.session.prepare(soft_by_id).await?;
        self.session.execute(&prepared, (now, message_id)).await.context("soft_delete_by_id")?;
        Ok(())
    }
}