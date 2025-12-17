import type { BackendMessageDTO } from "../dto";
import type { Message } from "../../types/chat";

export function adaptIncomingMessage(
  dto: BackendMessageDTO
): Message {
  return {
    id: dto.id,
    chatId: dto.chat_id,
    userId: dto.user.id,
    sender: {
      id: dto.user.id,
      name: dto.user.name,
      avatar: dto.user.avatar,
    },
    content: dto.file?.url ?? dto.text ?? "",
    createdAt: dto.created_at,

    reactions: [],
    readBy: [],

    fileMeta: dto.file
      ? {
          name: dto.file.name,
          size: dto.file.size,
          messageType: dto.file.type,
        }
      : undefined,
  };
}