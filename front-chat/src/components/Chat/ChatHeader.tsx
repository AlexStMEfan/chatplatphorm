// src/components/Chat/ChatHeader.tsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatMessage from "./ChatMessage";
import type { Message } from "./types";
import { Phone, Video, Info, FileText, Link} from "lucide-react";

interface ChatHeaderProps {
  chatName: string;
  chatAvatar?: string;
  chatStatus?: "online" | "offline" | "busy";
  isGroup?: boolean;

  messages: Message[];
  currentUserId: string;

  onReact?: (messageId: string, emoji: string) => void;
  onOpenActions?: (messageId: string) => void;
}

export default function ChatHeader({
  chatName,
  chatAvatar,
  chatStatus = "online",
  isGroup = false,
  messages,
  currentUserId,
  onReact,
  
}: ChatHeaderProps) {
  const [activeTab, setActiveTab] = useState<"Чат" | "Медиа" | "Файлы" | "Ссылки">("Чат");
  const [prevTab, setPrevTab] = useState(activeTab);
  const [, setInfoOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  

  const tabs = ["Чат", "Медиа", "Файлы", "Ссылки"] as const;

  const statusColor: Record<string, string> = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    busy: "bg-red-500",
  };

  /* ---------------- utils ---------------- */

  const getMessageType = (m: Message) => {
    if (m.mediaMeta?.messageType) return m.mediaMeta.messageType;
    if (!m.content) return "text";

    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(m.content)) return "image";
    if (/\.(pdf|docx|xlsx|txt)$/i.test(m.content)) return "file";
    if (/^https?:\/\//i.test(m.content)) return "link";

    return "text";
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* ---------------- derived ---------------- */

  const mediaMessages = messages.filter((m) => getMessageType(m) === "image");
  const fileMessages = messages.filter((m) => getMessageType(m) === "file");
  const linkMessages = messages.filter((m) => getMessageType(m) === "link");

  /* ---------------- effects ---------------- */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTabChange = (tab: typeof activeTab) => {
    setPrevTab(activeTab);
    setActiveTab(tab);
  };

  const getDirection = () =>
    tabs.indexOf(activeTab) > tabs.indexOf(prevTab) ? 1 : -1;

  const swipeVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
      x: direction > 0 ? -50 : 50,
      opacity: 0,
    }),
  };

  /* ---------------- render ---------------- */

  const tabContent = {
    Чат: (
      <div className="flex-1 h-full overflow-y-auto flex flex-col-reverse p-4">
        <div ref={messagesEndRef} />

        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const prev = messages[idx + 1];
            const showDate =
              !prev ||
              msg.createdAt?.slice(0, 10) !== prev.createdAt?.slice(0, 10);

            const isMe = msg.sender?.id === currentUserId;
            const showSenderName =
              !isMe && (!prev || prev.sender?.id !== msg.sender?.id);

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="mb-2"
              >
                {showDate && (
                  <div className="flex justify-center my-2">
                    <div className="px-3 py-1 rounded-2xl bg-white/30 dark:bg-dark-surface/30 backdrop-blur-xl text-xs">
                      {formatDate(msg.createdAt)}
                    </div>
                  </div>
                )}

                {showSenderName && (
                  <div className="text-xs text-text-muted mb-1 ml-2">
                    {msg.sender?.name}
                  </div>
                )}

                <ChatMessage
                  message={msg}
                  currentUserId={currentUserId}
                  onReact={onReact}
                />

                <div
                  className={`flex mt-1 text-xs text-text-muted ${
                    isMe ? "justify-end mr-2" : "justify-start ml-2"
                  }`}
                >
                  {formatTime(msg.createdAt)}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    ),

    Медиа: (
      <div className="flex-1 p-4 grid grid-cols-3 gap-3 overflow-y-auto">
        {mediaMessages.map((m) => (
          <img
            key={m.id}
            src={m.content}
            alt="media"
            className="w-full h-32 object-cover rounded-xl"
          />
        ))}
      </div>
    ),

    Файлы: (
      <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
        {fileMessages.map((m) => {
          const meta = m.mediaMeta!;
          return (
            <a
              key={m.id}
              href={m.content}
              download={meta.name}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-800"
            >
              <FileText size={18} />
              <div>
                <div className="font-medium truncate">{meta.name}</div>
                <div className="text-xs opacity-60">
                  {(meta.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </a>
          );
        })}
      </div>
    ),

    Ссылки: (
      <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
        {linkMessages.map((m) => (
          <a
            key={m.id}
            href={m.content}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 break-all"
          >
            <Link size={16} />
            <span className="truncate">{m.content}</span>
          </a>
        ))}
      </div>
    ),
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/30 backdrop-blur-xl border-b">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={chatAvatar || "/default-avatar.png"}
              className="w-10 h-10 rounded-full"
            />
            {!isGroup && (
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${statusColor[chatStatus]}`}
              />
            )}
          </div>

          <div>
            <div className="font-semibold">{chatName}</div>
            {!isGroup && (
              <div className="text-xs opacity-60">{chatStatus}</div>
            )}
          </div>
        </div>

        <div className="hidden md:flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className="relative text-sm font-medium"
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Phone size={20} />
          <Video size={20} />
          <Info size={20} onClick={() => setInfoOpen(true)} />
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence custom={getDirection()} mode="wait">
          <motion.div
            key={activeTab}
            custom={getDirection()}
            variants={swipeVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            {tabContent[activeTab]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}