import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { useMessagesStore } from "../stores/messages";
import type { Message, Reaction } from "../types/chat";

function adaptIncomingMessage(msg: Partial<Message>): Message {
  return {
    id: msg.id || String(Date.now()),
    chatId: msg.chatId || "unknown",
    userId: msg.userId || "unknown",
    sender: msg.sender || { id: msg.userId || "unknown", name: "Unknown" },
    content: msg.content || "",
    createdAt: msg.createdAt || new Date().toISOString(),
    reactions: msg.reactions || [],
    readBy: msg.readBy || [],
    fileMeta: msg.fileMeta,
  };
}

export function useChatSocket() {
  const addMessage = useMessagesStore((s) => s.addMessage);
  const updateMessageReaction = useMessagesStore((s) => s.updateMessageReaction);
  const markMessageRead = useMessagesStore((s) => s.markMessageRead);

  const wsRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket: Socket = io("http://localhost:4000");
    wsRef.current = socket;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on("chat-event", (data: any) => {
      switch (data.type) {
        case "message": {
          const msg = adaptIncomingMessage(data.payload);
          addMessage(msg);
          break;
        }
        case "reaction": {
          const { messageId, reaction } = data.payload as { messageId: string; reaction: Reaction };
          updateMessageReaction(messageId, reaction);
          break;
        }
        case "read": {
          const { messageId, userId } = data.payload as { messageId: string; userId: string };
          markMessageRead(messageId, userId);
          break;
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [addMessage, updateMessageReaction, markMessageRead]);

  return wsRef;
}