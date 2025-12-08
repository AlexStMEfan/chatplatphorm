import { useRef, useState, useEffect, type MouseEvent as ReactMouseEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { SmilePlus, File as FileIcon, Link as LinkIcon } from "lucide-react";
import type { Message } from "./types";

interface ChatMessageProps {
  message: Message;
  currentUserId: string;
  onReact?: (messageId: string, emoji: string) => void;
  onOpenActions?: (messageId: string, action: string) => void;
}

export default function ChatMessage({
  message,
  currentUserId,
  onReact,
  onOpenActions,
}: ChatMessageProps) {
  const isUser = message.sender.id === currentUserId;
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [showPicker, setShowPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const availableReactions = ["👍", "❤️", "🔥", "😂", "😮", "😢"];

  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    const menuWidth = 160;
    const menuHeight = 120;

    if (x + menuWidth > rect.width) x = rect.width - menuWidth;
    if (y + menuHeight > rect.height) y = rect.height - menuHeight;
    if (x < 0) x = 0;
    if (y < 0) y = 0;

    setMenuPosition({ x, y });
    setShowMenu(true);
  };

  const handleAction = (action: string) => {
    onOpenActions?.(message.id, action);
    setShowMenu(false);
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getMessageType = (m: Message) => {
    if (m.fileMeta?.messageType) return m.fileMeta.messageType;
    if (/\.(pdf|docx|xlsx|txt)$/i.test(m.content)) return "file";
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(m.content)) return "image";
    if (/^https?:\/\//i.test(m.content)) return "link";
    return "text";
  };

  const renderContent = () => {
    const type = getMessageType(message);

    if (type === "image") {
      return <img src={message.content} alt={message.fileMeta?.name} className="max-w-[250px] max-h-[200px] rounded-xl shadow object-contain" />;
    }

    if (type === "file" && message.fileMeta) {
      const meta = message.fileMeta;
      return (
        <a href={message.content} download={meta.name} className="flex flex-col max-w-[250px] gap-1 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <FileIcon size={18} />
            <span className="font-medium truncate text-text-dark dark:text-white">{meta.name}</span>
          </div>
          <span className="text-xs opacity-60">{(meta.size / 1024).toFixed(1)} KB</span>
        </a>
      );
    }

    if (["link", "url"].includes(type)) {
      return (
        <a href={message.content} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl max-w-[250px] bg-blue-100 dark:bg-blue-900 text-text-dark dark:text-white break-all">
          <LinkIcon size={16} />
          <span>{message.content}</span>
        </a>
      );
    }

    // Markdown рендер для текста
    return (
      <div className="max-w-[250px] break-words">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div ref={containerRef} onContextMenu={handleContextMenu} className={`flex flex-col mb-2 group relative ${isUser ? "items-end" : "items-start"}`}>
      <div className={`flex items-end gap-2 w-full ${isUser ? "justify-end" : ""}`}>
        {!isUser && message.sender.avatar && <img src={message.sender.avatar} className="w-8 h-8 rounded-full" />}

        <div className="flex flex-col items-start">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`relative px-3 py-2 rounded-2xl shadow-[inset_0_0_4px_rgba(0,0,0,0.06)] ${isUser ? "bg-primary text-white self-end" : "bg-white/30 dark:bg-dark-surface/30 text-text-dark dark:text-white backdrop-blur-xl"}`}>
            {renderContent()}

            <button onClick={(e) => { e.stopPropagation(); setShowPicker(v => !v); }} className={`absolute -bottom-5 ${isUser ? "right-2" : "left-2"} opacity-0 group-hover:opacity-100 transition bg-surface dark:bg-dark-surface shadow-md rounded-full p-1`}>
              <SmilePlus size={16} />
            </button>

            <AnimatePresence>
              {showPicker && (
                <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} className={`absolute z-50 -bottom-14 ${isUser ? "right-0" : "left-0"} bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-xl shadow-lg p-2 flex gap-1`}>
                  {availableReactions.map((emoji) => (
                    <button key={emoji} onClick={() => { onReact?.(message.id, emoji); setShowPicker(false); }} className="px-2 py-1 rounded hover:bg-surface-hover dark:hover:bg-dark-hover">{emoji}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Время под сообщением */}
          {message.createdAt && (
            <div className={`flex mt-1 text-xs text-text-muted dark:text-dark-text-muted w-full ${isUser ? "justify-end mr-2" : "justify-start ml-2"}`}>
              {formatTime(message.createdAt)}
            </div>
          )}
        </div>

        {isUser && message.sender.avatar && <img src={message.sender.avatar} className="w-8 h-8 rounded-full" />}
      </div>

      {/* Reactions */}
      {message.reactions?.length && (
        <div className={`flex mt-1 gap-2 text-sm ${isUser ? "justify-end" : "justify-start"}`}>
          {message.reactions.map((r) => (
            <button key={r.emoji} onClick={() => onReact?.(message.id, r.emoji)} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-xl text-xs">
              {r.emoji} {r.count}
            </button>
          ))}
        </div>
      )}

      {/* Context menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute z-50 bg-white dark:bg-dark-surface border border-border dark:border-dark-border rounded-lg shadow-xl p-1" style={{ top: menuPosition.y, left: menuPosition.x, width: 160 }}>
            <button onClick={() => handleAction("reply")} className="block w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-black">Ответить</button>
            <button onClick={() => handleAction("forward")} className="block w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-black">Переслать</button>
            <button onClick={() => { navigator.clipboard.writeText(message.content); handleAction("copy"); }} className="block w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-black">Копировать</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}