import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatMessage from "./ChatMessage";
import type { Message } from "./types";
import { Phone, Video, Info, FileText, Link, X } from "lucide-react";

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
  onOpenActions,
}: ChatHeaderProps) {
  const [activeTab, setActiveTab] = useState("Чат");
  const [prevTab, setPrevTab] = useState(activeTab);
  const [infoOpen, setInfoOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const infoRef = useRef<HTMLDivElement | null>(null);

  const tabs = ["Чат", "Медиа", "Файлы", "Ссылки"];

  const statusColor = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    busy: "bg-red-500",
  };

  /** Универсальное определение типа сообщения */
  const getMessageType = (m: Message) => {
    if (m.fileMeta?.messageType) return m.fileMeta.messageType;
    if (/\.(pdf|docx|xlsx|txt)$/i.test(m.content)) return "file";
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(m.content)) return "image";
    if (/^https?:\/\//i.test(m.content)) return "link";
    return "text";
  };

  const mediaMessages = messages.filter((m) => getMessageType(m) === "image");
  const fileMessages = messages.filter((m) => getMessageType(m) === "file");
  const linkMessages = messages.filter((m) => getMessageType(m) === "link");

  const handleTabChange = (tab: string) => {
    setPrevTab(activeTab);
    setActiveTab(tab);
  };

  const getDirection = () =>
    tabs.indexOf(activeTab) > tabs.indexOf(prevTab) ? 1 : -1;

  const swipeVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction > 0 ? -50 : 50, opacity: 0 }),
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /** Форматирование даты (день) */
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  /** Форматирование времени под сообщением */
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  /** Контент вкладок */
  const tabContent = {
    "Чат": (
      <div className="flex-1 h-full overflow-y-auto flex flex-col-reverse p-4">
        <div ref={messagesEndRef} />
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const previousMessage = messages[idx + 1];
            const showDate =
              !previousMessage ||
              (msg.timestamp?.slice(0, 10) !== previousMessage.timestamp?.slice(0, 10));
            const isSenderUser = msg.sender.id === currentUserId;

            // Имя отправителя показываем только для чужих сообщений
            const showSenderName =
              !isSenderUser &&
              (!previousMessage || previousMessage.sender.id !== msg.sender.id);

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="mb-2"
              >
                {/* День */}
                {showDate && (
                  <div className="flex justify-center my-2">
                    <div className="px-3 py-1 rounded-2xl bg-white/30 dark:bg-dark-surface/30 backdrop-blur-xl text-xs text-text-dark dark:text-white">
                      {formatDate(msg.timestamp)}
                    </div>
                  </div>
                )}

                {/* Имя отправителя */}
                {showSenderName && (
                  <div className="text-xs text-text-muted dark:text-dark-text-muted mb-1 ml-2">
                    {msg.sender.name}
                  </div>
                )}

                {/* Сообщение */}
                <ChatMessage
                  message={msg}
                  currentUserId={currentUserId}
                  onReact={onReact}
                  onOpenActions={onOpenActions}
                />

                {/* Время под сообщением */}
                <div
                  className={`flex mt-1 text-xs text-text-muted dark:text-dark-text-muted ${
                    isSenderUser ? "justify-end mr-2" : "justify-start ml-2"
                  }`}
                >
                  {formatTime(msg.timestamp)}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    ),

    "Медиа": (
      <div className="flex-1 p-4 grid grid-cols-3 gap-3 overflow-y-auto">
        {mediaMessages.map((msg) => (
          <img
            key={msg.id}
            src={msg.content}
            alt="media"
            className="w-full h-32 object-cover rounded-xl"
          />
        ))}
      </div>
    ),

    "Файлы": (
      <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
        {fileMessages.map((msg) => {
          const meta = msg.fileMeta!;
          return (
            <a
              key={msg.id}
              href={msg.content}
              download={meta.name}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <FileText size={18} />
              <div className="flex flex-col">
                <span className="font-medium truncate">{meta.name}</span>
                <span className="text-xs opacity-60">
                  {(meta.size / 1024).toFixed(1)} KB
                </span>
              </div>
            </a>
          );
        })}
      </div>
    ),

    "Ссылки": (
      <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
        {linkMessages.map((msg) => (
          <a
            key={msg.id}
            href={msg.content}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 break-all"
          >
            <Link size={16} />
            <span className="truncate">{msg.content}</span>
          </a>
        ))}
      </div>
    ),
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 rounded-t-xl bg-white/30 dark:bg-dark-surface/30 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shadow-inner">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={chatAvatar || "/default-avatar.png"}
              className="w-10 h-10 rounded-full object-cover"
            />
            {!isGroup && (
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white/30 dark:border-dark-surface ${statusColor[chatStatus]}`}
              />
            )}
          </div>
          <div>
            <div className="font-semibold text-text-dark dark:text-white">{chatName}</div>
            {!isGroup && (
              <div className="text-xs text-text-muted dark:text-dark-text-muted capitalize">{chatStatus}</div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="hidden md:flex items-center gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className="relative text-sm font-medium px-2 py-1"
            >
              <span
                className={
                  activeTab === tab
                    ? "text-text-dark dark:text-white"
                    : "text-text-muted dark:text-dark-text-muted"
                }
              >
                {tab}
              </span>
              {activeTab === tab && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded"
                />
              )}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 p-1 border rounded-xl dark:border-gray-700">
          <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
            <Phone size={20} />
          </button>
          <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
            <Video size={20} />
          </button>
          <button
            onClick={() => setInfoOpen(true)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
          >
            <Info size={20} />
          </button>
        </div>
      </div>

      {/* TAB CONTENT */}
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
            {tabContent[activeTab as keyof typeof tabContent]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* INFO SIDEBAR */}
      <AnimatePresence>
        {infoOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInfoOpen(false)}
            />

            <motion.div
              className="fixed top-0 right-0 w-80 h-full bg-white dark:bg-dark-surface border-l border-gray-300 dark:border-gray-700 shadow-xl z-50 flex flex-col"
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              ref={infoRef}
            >
              <div className="flex justify-end p-3">
                <button
                  onClick={() => setInfoOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                <h3 className="text-lg font-semibold mb-3">Информация о чате</h3>
                <div className="flex items-center gap-3 mb-4">
                  <img src={chatAvatar || "/default-avatar.png"} className="w-12 h-12 rounded-full" />
                  <span className="font-medium text-lg">{chatName}</span>
                </div>

                {!isGroup && (
                  <p className="text-sm text-text-muted dark:text-dark-text-muted">Статус: {chatStatus}</p>
                )}

                <p className="mt-4 text-sm">Сообщений: <b>{messages.length}</b></p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}