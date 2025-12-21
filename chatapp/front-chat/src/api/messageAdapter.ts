import type { Message } from "../components/Chat/types";

type BackendMessage = {
  id: string;
  chat_id: string;
  text?: string;
  created_at: string;
  user: {
    id: string;
    name: string;
  };
};

export function mapBackendMessage(
  raw: BackendMessage
): Message {
  return {
    id: raw.id,
    chatId: raw.chat_id,
    userId: raw.user.id,
    content: raw.text ?? "",
    createdAt: raw.created_at,
    reactions: [],
    readBy: [],
  };
}