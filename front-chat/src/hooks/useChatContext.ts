// src/hooks/useChatContext.ts
import { useOutletContext } from "react-router-dom";
import type { Chat, User } from "../components/Chat/types";

export function useChatContext() {
  return useOutletContext<{
    chats: Chat[];
    activeChatId: string | null;
    setActiveChatId: (id: string | null) => void;
    handleChatCreate: (chat: Chat) => void;
    token: string;
    currentUser: User;
  }>();
}