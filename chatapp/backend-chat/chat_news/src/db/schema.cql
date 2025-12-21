-- Keyspace (create once)
-- Используем NetworkTopologyStrategy для продакшена
-- Если только один дата-центр, замените на SimpleStrategy
CREATE KEYSPACE IF NOT EXISTS chat
WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'datacenter1': 3
}
AND durable_writes = true;

-- Table for messages
CREATE TABLE IF NOT EXISTS chat.messages (
    chat_id uuid,
    created_at timestamp,
    message_id uuid,
    user_id uuid,
    content text,
    media_urls list<text>,
    media_meta map<text,text>,
    is_deleted boolean,
    deleted_at timestamp,
    edited_at timestamp,
    edited_by uuid,
    version bigint,
    PRIMARY KEY (chat_id, created_at, message_id)
) WITH CLUSTERING ORDER BY (created_at DESC)
   -- TTL можно указывать на insert, например: INSERT ... USING TTL 604800
;

-- Secondary table for fast lookup by message_id
CREATE TABLE IF NOT EXISTS chat.messages_by_id (
    message_id uuid PRIMARY KEY,
    chat_id uuid,
    created_at timestamp,
    user_id uuid,
    content text,
    media_urls list<text>,
    media_meta map<text,text>,
    is_deleted boolean,
    deleted_at timestamp,
    edited_at timestamp,
    edited_by uuid,
    version bigint
);