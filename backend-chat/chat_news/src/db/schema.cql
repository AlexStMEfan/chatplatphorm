-- Keyspace
CREATE KEYSPACE chat WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'replication_factor': 3
};

-- Чаты
CREATE TABLE chat.chats (
    chat_id UUID,
    name TEXT,
    is_group BOOLEAN,
    created_at TIMESTAMP,
    PRIMARY KEY (chat_id)
);

-- Участники чата
CREATE TABLE chat.chat_members (
    chat_id UUID,
    user_id UUID,
    joined_at TIMESTAMP,
    role TEXT,
    PRIMARY KEY (chat_id, user_id)
);

-- Сообщения
CREATE TABLE chat.messages (
    chat_id UUID,
    message_id UUID,
    user_id UUID,
    content TEXT,
    message_type TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY (chat_id, created_at, message_id)
) WITH CLUSTERING ORDER BY (created_at DESC);