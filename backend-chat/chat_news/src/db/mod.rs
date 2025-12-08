use scylla::Session;
use std::sync::Arc;

pub mod messages;

#[derive(Clone)]
pub struct Db {
    pub session: Arc<Session>,
}

impl Db {
    pub async fn connect(hosts: &[String]) -> Result<Self, scylla::Error> {
        let uri = hosts.join(",");
        let session = Session::connect(&uri).await?;
        session
            .query(
                "CREATE KEYSPACE IF NOT EXISTS chat WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}",
                &[],
            )
            .await?;
        session
            .query(
                "CREATE TABLE IF NOT EXISTS chat.messages (
                    chat_id uuid,
                    message_id uuid,
                    user_id uuid,
                    content text,
                    created_at timestamp,
                    PRIMARY KEY (chat_id, message_id)
                )",
                &[],
            )
            .await?;
        Ok(Self {
            session: Arc::new(session),
        })
    }
}