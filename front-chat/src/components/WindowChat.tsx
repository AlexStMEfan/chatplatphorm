// src/components/WindowChat.tsx
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatList from "./Chat/ChatList";
import ChatHeader from "./Chat/ChatHeader";
import type { Chat, Message } from "./Chat/types";
import { File, Send, Smile } from "lucide-react";
import { useChatContext } from "../pages/ChatPage";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";

interface WindowChatProps {
  chats: Chat[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  onChatCreate: (chat: Chat) => void;
}

export default function WindowChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const availableEmojis = ["😊", "😂", "❤️", "👍", "🔥", "😢"];
  const { chats, activeChatId, setActiveChatId, handleChatCreate } = useChatContext();
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleFileUpload = (files: FileList) => {
    if (!activeChatId) return;

    const newMessages: Message[] = Array.from(files).map((file) => {
      let messageType: "image" | "file" | "audio" | "video" | "other" = "other";
      if (file.type.startsWith("image/")) messageType = "image";
      else if (file.type.startsWith("audio/")) messageType = "audio";
      else if (file.type.startsWith("video/")) messageType = "video";
      else if (
        file.type.includes("pdf") ||
        file.type.includes("officedocument") ||
        file.type.includes("text")
      )
        messageType = "file";

      return {
        id: String(Date.now() + Math.random()),
        chatId: activeChatId,
        role: "user",
        content: URL.createObjectURL(file),
        sender: { id: "user1", name: "Вы" },
        fileMeta: {
          name: file.name,
          size: file.size,
          type: file.type,
          messageType,
        },
        timestamp: new Date().toISOString(),
      };
    });

    setMessages((prev) => [...prev, ...newMessages]);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || !activeChatId) return;

    const newMessage: Message = {
      id: String(Date.now()),
      chatId: activeChatId,
      role: "user",
      content: inputValue,
      sender: { id: "user1", name: "Вы" },
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    editor?.commands.setContent("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          chatId: activeChatId,
          role: "assistant",
          content: "Ответ ассистента на ваше сообщение.",
          sender: { id: "bot", name: "Ассистент" },
          timestamp: new Date().toISOString(),
        },
      ]);
    }, 600);
  };

  const activeChat = chats.find((c) => c.id === activeChatId);

  return (
    <motion.div className="w-full h-full bg-white/50 dark:bg-dark-surface/30 backdrop-blur-2xl border border-white/30 dark:border-dark-border rounded-3xl flex overflow-hidden">
      {/* Sidebar */}
      <motion.div className="w-[320px] h-full border-r border-border dark:border-dark-border overflow-auto">
        <ChatList
          chats={chats}
          activeChatId={activeChatId}
          setActiveChatId={setActiveChatId}
          onChatCreate={handleChatCreate}
        />
      </motion.div>

      {/* Активный чат */}
      <AnimatePresence mode="wait">
        {activeChat && (
          <motion.div className="flex-1 flex flex-col">
            <ChatHeader
              chatName={activeChat.name || ""}
              chatAvatar={activeChat.avatar}
              isGroup={activeChat.isGroup}
              currentUserId="user1"
              messages={messages.filter((m) => m.chatId === activeChat.id)}
              onReact={(messageId, emoji) =>
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === messageId
                      ? {
                          ...m,
                          reactions: m.reactions
                            ? [
                                ...m.reactions.filter((r) => r.emoji !== emoji),
                                {
                                  emoji,
                                  count:
                                    (m.reactions.find((r) => r.emoji === emoji)
                                      ?.count || 0) + 1,
                                },
                              ]
                            : [{ emoji, count: 1 }],
                        }
                      : m
                  )
                )
              }
              onOpenActions={(messageId) =>
                console.log("Открыть меню для сообщения:", messageId)
              }
            />

            <div
              className="relative flex items-end gap-2 p-2 rounded-t-3xl border-t border-white/20 bg-white/20 dark:bg-black/20 backdrop-blur-2xl shadow-[inset_0_0_80px_rgba(255,255,255,0.18)]"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.length)
                  handleFileUpload(e.dataTransfer.files);
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
                onChange={(e) =>
                  e.target.files && handleFileUpload(e.target.files)
                }
              />
              <button
                onClick={() =>
                  document.getElementById("fileUploadInput")?.click()
                }
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