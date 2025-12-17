// src/components/Chat/ChatTabs.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatMessage from "./ChatMessage";
import type { Message } from "./types";

interface ChatTabsProps {
  messages: Message[];
  currentUserId: string;
}

export default function ChatTabs({ messages, currentUserId }: ChatTabsProps) {
  const [activeTab, setActiveTab] = useState("Чат");
  const [prevTab, setPrevTab] = useState(activeTab);

  const tabs = ["Чат", "Медиа", "Файлы", "Ссылки"];

  const handleTabChange = (tab: string) => {
    setPrevTab(activeTab);
    setActiveTab(tab);
  };

  const getDirection = () => (tabs.indexOf(activeTab) > tabs.indexOf(prevTab) ? 1 : -1);

  const swipeVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction > 0 ? -50 : 50, opacity: 0 }),
  };

  const tabContent: Record<string, React.ReactNode> = {
    "Чат": (
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto p-2">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    ),
    "Медиа": <div className="p-4 text-sm text-text-muted">Медиа файлы</div>,
    "Файлы": <div className="p-4 text-sm text-text-muted">Файлы</div>,
    "Ссылки": <div className="p-4 text-sm text-text-muted">Ссылки</div>,
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Tabs */}
      <div className="hidden md:flex items-center gap-6 relative border-b border-border dark:border-dark-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className="relative text-sm font-medium px-2 py-1 transition-colors"
          >
            <span
              className={`${
                activeTab === tab
                  ? "text-text-dark dark:text-white"
                  : "text-text-muted dark:text-dark-text-muted hover:text-text-dark dark:hover:text-white"
              }`}
            >
              {tab}
            </span>
            {activeTab === tab && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
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
            className="absolute top-0 left-0 w-full h-full"
          >
            {tabContent[activeTab]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}