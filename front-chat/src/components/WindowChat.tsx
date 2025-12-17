// src/components/WindowChat.tsx
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatList from "./Chat/ChatList";
import ChatHeader from "./Chat/ChatHeader";
import type { Message } from "../types/chat";
import { File, Send, Smile } from "lucide-react";
import { useChatContext } from "../hooks/useChatContext";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import { useChatSocket } from "../api/useChatSocket";
import { useMessagesStore } from "../stores/messages";

export default function WindowChat() {
  const { chats, activeChatId, setActiveChatId, handleChatCreate } = useChatContext();
  const [inputValue, setInputValue] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const availableEmojis = ["😊", "😂", "❤️", "👍", "🔥", "😢"];

  const editor = useEditor({
    extensions: [
      StarterKit,
      CodeBlockLowlight.configure({ lowlight: createLowlight() }),
      Placeholder.configure({ placeholder: "Напишите сообщение…" }),
    ],
    content: inputValue,
    onUpdate({ editor }) {
      setInputValue(editor.getHTML());
    },
  });

  const messages = useMessagesStore((s) => s.messages[activeChatId || ""] || []);
  const addMessage = useMessagesStore((s) => s.addMessage);
  const addReaction = useMessagesStore((s) => s.addReaction);

  // WebSocket
  const wsRef = useChatSocket();

  useEffect(() => {
  const socket = wsRef.current;
  if (!socket) return;

  interface ChatEvent {
  type: "message" | "reaction" | "read";
  payload: unknown;
}
  // Вместо onmessage используем socket.io on
  socket.on("chat-event", (data: ChatEvent) => {
  switch (data.type) {
    case "message": {
      const msg = data.payload as Message;
      addMessage({
        ...msg,
        sender: msg.sender || { id: msg.userId, name: "Unknown" },
        reactions: msg.reactions || [],
        readBy: msg.readBy || [],
      });
      break;
    }
    case "reaction": {
      const reactionData = data.payload as { messageId: string; reaction: { emoji: string }; chatId: string };
      addReaction(reactionData.messageId, reactionData.reaction.emoji, reactionData.chatId, "user1");
      break;
    }
    case "read":
      break;
  }
});

  return () => {
    socket.off("chat-event"); // отписываемся
  };
}, [wsRef, addMessage, addReaction]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => scrollToBottom(), [messages]);

  const handleFileUpload = (files: FileList) => {
    if (!activeChatId) return;
    Array.from(files).forEach((file) => {
      const newMessage: Message = {
        id: String(Date.now() + Math.random()),
        chatId: activeChatId,
        userId: "user1",
        content: URL.createObjectURL(file),
        createdAt: new Date().toISOString(),
        sender: { id: "user1", name: "Вы" },
        reactions: [],
        readBy: [],
      };
      addMessage(newMessage);
      wsRef.current?.send(JSON.stringify({ type: "message", payload: newMessage }));
    });
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || !activeChatId) return;
    const newMessage: Message = {
      id: String(Date.now()),
      chatId: activeChatId,
      userId: "user1",
      content: inputValue,
      createdAt: new Date().toISOString(),
      sender: { id: "user1", name: "Вы" },
      reactions: [],
      readBy: [],
    };
    addMessage(newMessage);
    editor?.commands.setContent("");
    setInputValue("");
    wsRef.current?.send(JSON.stringify({ type: "message", payload: newMessage }));
  };

  const activeChat = chats.find((c) => c.id === activeChatId);

  return (
    <motion.div className="w-full h-full bg-white/50 dark:bg-dark-surface/30 backdrop-blur-2xl border border-white/30 dark:border-dark-border rounded-3xl flex overflow-hidden">
      <motion.div className="w-[320px] h-full border-r border-border dark:border-dark-border overflow-auto">
        <ChatList
          chats={chats}
          activeChatId={activeChatId}
          setActiveChatId={setActiveChatId}
          onChatCreate={handleChatCreate}
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {activeChat && (
          <motion.div className="flex-1 flex flex-col">
            <ChatHeader
              chatName={activeChat.name || ""}
              chatAvatar={activeChat.avatar}
              isGroup={activeChat.isGroup}
              currentUserId="user1"
              messages={messages}
              onReact={(messageId, emoji) => addReaction(messageId, emoji, activeChatId!, "user1")}
              onOpenActions={(messageId) => console.log("Открыть меню для сообщения:", messageId)}
            />

            <div
              className="relative flex items-end gap-2 p-2 rounded-t-3xl border-t border-white/20 bg-white/20 dark:bg-black/20 backdrop-blur-2xl shadow-[inset_0_0_80px_rgba(255,255,255,0.18)]"
              onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.length) handleFileUpload(e.dataTransfer.files);
              }}
            >
              <AnimatePresence>
                {isDragging && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 rounded-3xl border-2 border-dashed border-primary bg-white/40 dark:bg-black/40 backdrop-blur-xl flex items-center justify-center"
                  >
                    <span className="text-primary text-lg font-medium">
                      Бросьте файл сюда
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <input
                id="fileUploadInput"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
              <button
                onClick={() => document.getElementById("fileUploadInput")?.click()}
                className="shrink-0 w-10 h-10 p-2 rounded-xl hover:bg-white/30 dark:hover:bg-white/20 text-text-muted dark:text-dark-text-muted transition flex items-center justify-center"
                title="Загрузить файл"
              >
                <File size={20} />
              </button>

              <button
                onClick={() => setShowEmojiPicker((v) => !v)}
                className="shrink-0 w-10 h-10 p-2 rounded-xl hover:bg-white/30 dark:hover:bg-white/20 text-text-muted dark:text-dark-text-muted transition flex items-center justify-center"
                title="Эмодзи"
              >
                <Smile size={20} />
              </button>

              <div className="flex-1">
                <EditorContent
                  editor={editor}
                  className="w-full min-h-10 px-4 py-2 rounded-2xl bg-white/40 dark:bg-black/40 backdrop-blur-xl text-text-dark dark:text-dark-text-light border border-white/30 dark:border-white/10 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-primary-hover focus:border-primary-hover scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
                />
              </div>

              <button
                onClick={handleSendMessage}
                className="shrink-0 w-10 h-10 px-3 py-2 bg-primary text-white rounded-2xl hover:bg-primary-hover transition flex items-center justify-center"
              >
                <Send />
              </button>

              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-16 left-4 z-50 p-3 bg-white/60 dark:bg-black/60 backdrop-blur-2xl border border-white/30 dark:border-white/10 rounded-2xl shadow-xl flex gap-1"
                  >
                    {availableEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          editor?.commands.insertContent(emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="px-2 py-1 text-xl rounded hover:bg-white/40 transition"
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}