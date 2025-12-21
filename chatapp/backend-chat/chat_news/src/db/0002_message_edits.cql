-- Table for message edits history
CREATE TABLE IF NOT EXISTS chat.message_edits (
    message_id uuid,
    edit_id uuid,
    edited_at timestamp,
    editor uuid,
    old_content text,
    new_content text,
    meta map<text, text>,
    PRIMARY KEY (message_id, edited_at, edit_id)
) WITH CLUSTERING ORDER BY (edited_at DESC);