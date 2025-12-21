// src/utils/mapEventToMessage.ts
import type { ChatEvent, Message, MessageFileMeta } from "../components/Chat/types";

function buildFileMeta(meta: NonNullable<ChatEvent['media_meta']>): MessageFileMeta | undefined {
  // Если хотя бы одного обязательного поля нет — возвращаем undefined
  if (
    meta.name == null ||
    meta.size == null ||
    meta.type == null ||
    meta.messageType == null
  ) {
    return undefined;
  }

  // Преобразуем messageType в union-тип
  const validMessageTypes = ["image", "file", "audio", "video", "other"] as const;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messageType = validMessageTypes.includes(meta.messageType as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (meta.messageType as any)
    : "other";

  return {
    name: meta.name,
    size: meta.size,
    type: meta.type,
    messageType, // теперь точно соответствует "image" | "file" | ...
  };
}

export function mapEventToMessage(ev: ChatEvent): Message {
  return {
    id: ev.message_id,
    chatId: ev.chat_id,
    userId: ev.user_id,
    content: ev.content ?? undefined,
    mediaUrls: ev.media_urls ?? undefined,
    mediaMeta: ev.media_meta ? buildFileMeta(ev.media_meta) : undefined,
    createdAt: ev.created_at,
    editedAt: ev.edited_at ?? undefined,
    isDeleted: ev.is_deleted ?? false,
  };
}