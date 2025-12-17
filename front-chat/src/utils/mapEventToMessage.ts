import type { ChatEvent } from "../api/types";
import type { Message } from "../components/Chat/types";

export function mapEventToMessage(ev: ChatEvent): Message {
  return {
    id: ev.message_id,
    chatId: ev.chat_id,
    userId: ev.user_id,
    content: ev.content ?? undefined,
    mediaUrls: ev.media_urls ?? undefined,
    mediaMeta: ev.media_meta ?? undefined,
    createdAt: ev.created_at,
    editedAt: ev.edited_at ?? undefined,
    isDeleted: ev.is_deleted ?? false,
  };
}