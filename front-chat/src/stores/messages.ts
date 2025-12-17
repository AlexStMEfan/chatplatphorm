import { create } from "zustand";
import type { Message, Reaction } from "../types/chat";

type MessagesState = {
  messages: Record<string, Message[]>; // chatId -> Message[]
  addMessage: (msg: Message) => void;
  updateMessageReaction: (messageId: string, reaction: Reaction) => void;
  markMessageRead: (messageId: string, userId: string) => void;
  addReaction: (messageId: string, emoji: string, chatId: string, userId: string) => void;
};

export const useMessagesStore = create<MessagesState>((set) => ({
  messages: {},

  addMessage: (msg) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [msg.chatId]: [...(state.messages[msg.chatId] || []), msg],
      },
    })),

  updateMessageReaction: (messageId, reaction) =>
    set((state) => {
      const newMessages: Record<string, Message[]> = {};
      for (const chatId in state.messages) {
        newMessages[chatId] = state.messages[chatId].map((msg) => {
          if (msg.id !== messageId) return msg;

          const existingReaction = msg.reactions?.find((r) => r.emoji === reaction.emoji);

          if (existingReaction) {
            const reactedBy = new Set(existingReaction.reactedBy || []);
            reactedBy.add(reaction.reactedBy?.[0] || "");
            return {
              ...msg,
              reactions: msg.reactions!.map((r) =>
                r.emoji === reaction.emoji ? { ...r, count: reactedBy.size, reactedBy: Array.from(reactedBy) } : r
              ),
            };
          } else {
            return {
              ...msg,
              reactions: [...(msg.reactions || []), { ...reaction, reactedBy: reaction.reactedBy || [] }],
            };
          }
        });
      }
      return { messages: newMessages };
    }),

  markMessageRead: (messageId, userId) =>
    set((state) => {
      const newMessages: Record<string, Message[]> = {};
      for (const chatId in state.messages) {
        newMessages[chatId] = state.messages[chatId].map((msg) => {
          if (msg.id !== messageId) return msg;
          const readBy = new Set(msg.readBy || []);
          readBy.add(userId);
          return { ...msg, readBy: Array.from(readBy) };
        });
      }
      return { messages: newMessages };
    }),

  addReaction: (messageId, emoji, chatId, userId) =>
    set((state) => {
      const newMessages = { ...state.messages };
      const msgs = newMessages[chatId] || [];
      newMessages[chatId] = msgs.map((m) => {
        if (m.id !== messageId) return m;

        const existing = m.reactions?.find((r) => r.emoji === emoji);
        if (existing) {
          const reactedBy = new Set(existing.reactedBy || []);
          reactedBy.add(userId);
          return {
            ...m,
            reactions: m.reactions!.map((r) =>
              r.emoji === emoji ? { ...r, count: reactedBy.size, reactedBy: Array.from(reactedBy) } : r
            ),
          };
        } else {
          return {
            ...m,
            reactions: [...(m.reactions || []), { emoji, count: 1, reactedBy: [userId] }],
          };
        }
      });
      return { messages: newMessages };
    }),
}));