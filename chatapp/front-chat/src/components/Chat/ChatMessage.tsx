// src/components/Chat/ChatMessage.tsx
import { useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { SmilePlus, File as FileIcon, Link as LinkIcon } from "lucide-react";
import type { Message, MessageFileMeta, MessageReaction } from "./types";
import { useMessagesStore } from "../../stores/messages";

interface ChatMessageProps {
  message: Message;
  currentUserId: string;
  onReact?: (messageId: string, emoji: string) => void;
}

export default function ChatMessage({
  message,
  currentUserId,
  onReact,
}: ChatMessageProps) {
  const isUser = message.userId === currentUserId;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const addReaction = useMessagesStore((s) => s.addReaction);

  const availableReactions = ["👍", "❤️", "🔥", "😂", "😮", "😢"];

  /** Закрытие попапа по клику вне */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /** Формат времени */
  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  /** Контент сообщения */
  const renderContent = () => {
    const meta = message.mediaMeta as MessageFileMeta | undefined;

    if (meta?.messageType === "image" && message.content) {
      return (
        <img
          src={message.content}
          alt={meta.name}
          className="max-w-[250px] max-h-[200px] rounded-xl object-contain"
        />
      );
    }

    if (meta?.messageType === "file" && message.content) {
      return (
        <a
          href={message.content}
          download={meta.name}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800"
        >
          <FileIcon size={18} />
          <span className="truncate">{meta.name}</span>
        </a>
      );
    }

    if (message.content?.startsWith("http")) {
      return (
        <a
          href={message.content}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-100 dark:bg-blue-900 break-all"
        >
          <LinkIcon size={16} />
          {message.content}
        </a>
      );
    }

    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {message.content ?? ""}
      </ReactMarkdown>
    );
  };

  /** Обработка реакции */
  const handleReact = (emoji: string) => {
    onReact?.(message.id, emoji);
    addReaction(message.id, message.chatId, emoji, currentUserId);
    setShowPicker(false);
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col mb-2 ${isUser ? "items-end" : "items-start"}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative px-3 py-2 rounded-2xl max-w-[70%] ${
          isUser
            ? "bg-primary text-white"
            : "bg-white/30 dark:bg-dark-surface/30 backdrop-blur-xl"
        }`}
      >
        {renderContent()}

        {/* Emoji picker */}
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="absolute -bottom-5 right-2 opacity-0 group-hover:opacity-100"
        >
          <SmilePlus size={16} />
        </button>

        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="absolute z-50 -bottom-14 right-0 bg-surface rounded-xl p-2 flex gap-1"
            >
              {availableReactions.map((emoji) => (
                <button key={emoji} onClick={() => handleReact(emoji)}>
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Реакции под сообщением */}
      {message.reactions?.length ? (
        <div className="flex mt-1 gap-2 text-sm">
          {message.reactions.map((r: MessageReaction) => (
            <button
              key={r.emoji}
              onClick={() => handleReact(r.emoji)}
              className="flex items-center gap-1 px-2 py-1 rounded-xl text-xs"
            >
              {r.emoji} {r.count}
            </button>
          ))}
        </div>
      ) : null}

      {/* Read receipts */}
      {message.readBy?.length ? (
        <span className="mt-1 text-xs opacity-60">
          Прочитали: {message.readBy.length}
        </span>
      ) : null}

      <span className="mt-1 text-xs opacity-60">
        {formatTime(message.createdAt)}
      </span>
    </div>
  );
}