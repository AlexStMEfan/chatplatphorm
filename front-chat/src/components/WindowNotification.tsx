import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Phone,
  MessageCircle,
  Tag,
  Bell,
  Pin,
  Trash2,
  X,
} from "lucide-react";

export type NotificationType =
  | "call"
  | "message"
  | "tag"
  | "system"
  | "other";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  pinned?: boolean;
  read?: boolean;
  time: Date;
  avatar?: string;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "call",
    title: "Входящий звонок от Алекса",
    description: "Нажмите, чтобы ответить прямо из чата",
    pinned: false,
    read: false,
    time: new Date(),
    avatar: "https://i.pravatar.cc/32?img=1",
  },
  {
    id: "2",
    type: "message",
    title: "Новое сообщение от Ивана",
    description: "Привет! Как продвигается проект?",
    pinned: false,
    read: false,
    time: new Date(),
    avatar: "https://i.pravatar.cc/32?img=2",
  },
  {
    id: "3",
    type: "tag",
    title: "Вы упомянуты в задаче",
    description: "#важно",
    pinned: false,
    read: false,
    time: new Date(Date.now() - 24 * 60 * 60 * 1000),
    avatar: "https://i.pravatar.cc/32?img=3",
  },
];

export default function WindowNotification() {
  const [notifications, setNotifications] =
    useState<Notification[]>(mockNotifications);
  const [activeType, setActiveType] =
    useState<NotificationType | "all">("all");
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  // ------------------- Actions -------------------
  const togglePin = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, pinned: !n.pinned } : n
      )
    );
  };

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const filteredNotifications =
    activeType === "all"
      ? notifications
      : notifications.filter((n) => n.type === activeType);

  const typeIcon = (type: NotificationType) => {
    switch (type) {
      case "call":
        return <Phone className="w-4 h-4 text-primary" />;
      case "message":
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      case "tag":
        return <Tag className="w-4 h-4 text-yellow-500" />;
      case "system":
        return <Bell className="w-4 h-4 text-gray-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const groupNotifications = (items: Notification[]) => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const earlier: Notification[] = [];

    const now = new Date();
    const todayStr = now.toDateString();
    const yesterdayStr = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();

    items.forEach((n) => {
      const nStr = n.time.toDateString();
      if (nStr === todayStr) today.push(n);
      else if (nStr === yesterdayStr) yesterday.push(n);
      else earlier.push(n);
    });

    return [
      { label: "Сегодня", items: today },
      { label: "Вчера", items: yesterday },
      { label: "Ранее", items: earlier },
    ];
  };

  const grouped = groupNotifications(filteredNotifications);

  const renderActions = (n: Notification) => {
    switch (n.type) {
      case "call":
        return (
          <div className="flex gap-2 mt-2">
            <button
              className="px-3 py-1.5 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 transition text-xs"
              onClick={(e) => {
                e.stopPropagation();
                alert(`Принять звонок: ${n.title}`);
                markRead(n.id);
              }}
            >
              Принять
            </button>
            <button
              className="px-3 py-1.5 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 transition text-xs"
              onClick={(e) => {
                e.stopPropagation();
                alert(`Отклонить звонок: ${n.title}`);
                markRead(n.id);
              }}
            >
              Отклонить
            </button>
          </div>
        );
      case "message":
        return (
          <div className="flex flex-col gap-2 mt-2">
            <input
              type="text"
              value={replyText[n.id] || ""}
              onChange={(e) =>
                setReplyText({ ...replyText, [n.id]: e.target.value })
              }
              placeholder="Ответить..."
              className="w-full rounded-xl border px-3 py-2 text-sm dark:bg-dark-input dark:border-dark-border"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 transition text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  alert(
                    `Ответ на сообщение: ${n.title}\nТекст: ${replyText[n.id]}`
                  );
                  setReplyText({ ...replyText, [n.id]: "" });
                  markRead(n.id);
                }}
              >
                Отправить
              </button>
            </div>
          </div>
        );
      case "tag":
        return (
          <div className="flex gap-2 mt-2">
            <button
              className="px-3 py-1.5 rounded-xl bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition text-xs"
              onClick={(e) => {
                e.stopPropagation();
                alert(`Открыть задачу для упоминания: ${n.title}`);
                markRead(n.id);
              }}
            >
              Открыть
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      className="w-full h-full bg-white/50 dark:bg-dark-surface/30 backdrop-blur-2xl border border-white/30 dark:border-dark-border rounded-3xl flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-dark-border">
        <h2 className="text-lg font-semibold text-text-dark dark:text-white">
          Уведомления
        </h2>

        <div className="flex gap-2 items-center">
          <button
            className="px-3 py-1 rounded-xl text-xs font-medium border transition bg-gray-100 dark:bg-dark-input border-border text-text-dark dark:text-white hover:bg-gray-200 dark:hover:bg-dark-surface"
            onClick={markAllRead}
          >
            Отметить все как прочитанные
          </button>

          {(["all", "call", "message", "tag", "system"] as const).map(
            (t) => (
              <button
                key={t}
                onClick={() =>
                  setActiveType(t === "all" ? "all" : t)
                }
                className={`px-3 py-1 rounded-xl text-xs font-medium border transition ${
                  activeType === t
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-gray-100 dark:bg-dark-input border-border text-text-dark dark:text-white hover:bg-gray-200 dark:hover:bg-dark-surface"
                }`}
              >
                {t === "all" ? "Все" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            )
          )}
        </div>
      </div>

      {/* Notifications list */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <AnimatePresence>
          {grouped.map((group) => (
            <div key={group.label}>
              {group.items.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-text-muted dark:text-dark-text-muted mb-2">
                    {group.label}
                  </div>

                  {group.items.map((n) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 50, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className={`relative flex flex-col bg-white dark:bg-dark-surface border border-border dark:border-dark-border p-3 rounded-xl shadow cursor-pointer ${
                        n.read ? "opacity-70" : "opacity-100"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {n.avatar && (
                            <img
                              src={n.avatar}
                              className="w-6 h-6 rounded-full"
                              alt="avatar"
                            />
                          )}
                          {typeIcon(n.type)}
                          <span className="font-medium text-text-dark dark:text-white">
                            {n.title}
                          </span>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePin(n.id);
                            }}
                            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-dark-input transition"
                          >
                            <Pin
                              className={`w-4 h-4 ${
                                n.pinned ? "text-primary" : "text-text-muted"
                              }`}
                            />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(n.id);
                            }}
                            className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900 transition"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      </div>

                      {n.description && (
                        <span className="text-xs text-text-muted dark:text-dark-text-muted mt-1">
                          {n.description}
                        </span>
                      )}

                      {/* Inline actions */}
                      {renderActions(n)}
                    </motion.div>
                  ))}
                </>
              )}
            </div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}