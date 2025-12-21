import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import type { Chat } from "./types";

interface SortableChatItemProps {
  chat: Chat;
  activeChat: string | null;
  setActiveChat: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listeners: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setNodeRef: any;
  isDragging: boolean;
  style: React.CSSProperties;
  onAction: (action: "favorite" | "mute" | "archive" | "delete", chat: Chat) => void;
}

export default function SortableChatItem({
  chat,
  activeChat,
  setActiveChat,
  listeners,
  attributes,
  setNodeRef,
  isDragging,
  style,
  onAction,
}: SortableChatItemProps) {
  const isActive = activeChat === chat.id;

  return (
    <div ref={setNodeRef} style={style} className="select-none">
      <motion.div
        initial={false}
        animate={{ scale: isDragging ? 1.03 : 1 }}
        transition={{ duration: 0.12 }}
        className="relative"
      >
        <div
          onClick={() => !isDragging && setActiveChat(chat.id)}
          className={`
            group relative w-full flex items-center gap-3 p-3 rounded-xl
            cursor-pointer transition-all duration-150
            ${isActive ? "bg-[#E5F7F2] dark:bg-[rgba(0,183,135,0.12)]" : ""}
            hover:bg-[#E5F7F2] dark:hover:bg-[rgba(0,183,135,0.08)]
          `}
        >
          {/* Active indicator */}
          {isActive && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
              style={{
                background: "#64CD84",
                boxShadow: "0 0 10px #64CD84",
              }}
            />
          )}

          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center text-white text-sm font-medium"
            style={{ background: "#00956F" }}
          >
            {chat.avatar ? (
              <img src={chat.avatar} className="w-full h-full object-cover" />
            ) : (
              chat.name?.[0] ?? "?"
            )}
          </div>

          {/* Chat info */}
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-medium text-[#1F1F1F] dark:text-white truncate">
              {chat.name}
            </span>
            <span className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] truncate">
              {chat.lastMessage}
            </span>
          </div>

          {/* Time */}
          <span className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] ml-2">
            {new Date(chat.date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          {/* Dropdown */}
          <Menu as="div" className="relative ml-1">
            <Menu.Button
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-md text-text-dark hover:bg-[#F2F2F2] dark:hover:bg-white/10 transition"
            >
              <MoreHorizontal className="w-4 h-4 text-[#3A3A3A] dark:text-white" />
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition duration-120 ease-out"
              enterFrom="opacity-0 translate-y-1 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="transition duration-100 ease-in"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-1 scale-95"
            >
              <Menu.Items
                className="
                  absolute right-0 mt-2 w-48 z-50 rounded-xl py-1
                  bg-white dark:bg-[#1E1E1E]
                  border border-[#E0E0E0] dark:border-[#2A2A2A]
                  shadow-[0_8px_30px_rgba(0,0,0,0.12)] text-text-dark
                "
              >
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={(e) => { e.stopPropagation(); onAction("favorite", chat); }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition ${active ? "bg-[#E5F7F2] dark:bg-[rgba(0,183,135,0.15)]" : ""}`}
                    >
                      {chat.favorite ? "Убрать из избранного" : "Добавить в избранное"}
                    </button>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={(e) => { e.stopPropagation(); onAction("mute", chat); }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition ${active ? "bg-[#E5F7F2] dark:bg-[rgba(0,183,135,0.15)]" : ""}`}
                    >
                      {chat.muted ? "Размьютить" : "Замьютить"}
                    </button>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={(e) => { e.stopPropagation(); onAction("archive", chat); }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition ${active ? "bg-[#E5F7F2] dark:bg-[rgba(0,183,135,0.15)]" : ""}`}
                    >
                      Архивировать
                    </button>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={(e) => { e.stopPropagation(); onAction("delete", chat); }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md text-red-600 transition ${active ? "bg-red-50 dark:bg-red-900/20" : ""}`}
                    >
                      Удалить
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>

          {/* Grip / drag handle */}
          <div
            className="ml-1 px-1 flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical
              {...listeners}
              {...attributes}
              className="
                w-4 h-4 opacity-35 dark:opacity-40
                hover:opacity-80 cursor-grab active:cursor-grabbing
                text-[#6B6B6B] dark:text-[#A0A0A0] transition
              "
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}