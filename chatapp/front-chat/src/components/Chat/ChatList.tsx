// src/components/Chat/ChatList.tsx
import { useState, useMemo, useEffect, Fragment } from "react";
import type { Chat } from "./types";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToWindowEdges } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableWrapper from "./SortableWrapper";
import { MessageCirclePlus, ArrowUpNarrowWide, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Transition } from "@headlessui/react";
import { debounce } from "lodash";
import { searchUsers } from "../../api/auth";
import type { UserSearchResult } from "../../api/auth";

interface ChatListProps {
  chats: Chat[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  onChatCreate: (chat: Chat) => void;
}

export default function ChatList({ chats, activeChatId, setActiveChatId, onChatCreate }: ChatListProps) {
  const [showFavorites, setShowFavorites] = useState(true);
  const [showRecent, setShowRecent] = useState(true);
  const [newChatMode, setNewChatMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [chatList, setChatList] = useState<Chat[]>(chats);
  const [chatOrder, setChatOrder] = useState<string[]>(chats.map(c => c.id));
  const [showArchived, setShowArchived] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  // Синхронизация с пропсами
  useEffect(() => {
    setChatList(chats);
    setChatOrder(chats.map(c => c.id));
  }, [chats]);

  /* ---------------- chat grouping ---------------- */
  const visibleChats = chatList.filter(c => !c.archived);
  const favorites = visibleChats.filter(c => c.favorite);

  const recent = useMemo(() => {
    const today: Chat[] = [];
    const yesterday: Chat[] = [];
    const earlier: Chat[] = [];
    const now = new Date();
    const todayStr = now.toDateString();
    const yd = new Date(now);
    yd.setDate(now.getDate() - 1);
    const yesterdayStr = yd.toDateString();

    visibleChats.forEach(c => {
      if (c.favorite) return;
      const d = new Date(c.date).toDateString();
      if (d === todayStr) today.push(c);
      else if (d === yesterdayStr) yesterday.push(c);
      else earlier.push(c);
    });
    return { today, yesterday, earlier };
  }, [visibleChats]);

  /* ---------------- DnD ---------------- */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = chatOrder.indexOf(active.id.toString());
    const newIndex = chatOrder.indexOf(over.id.toString());
    if (oldIndex === -1 || newIndex === -1) return;
    setChatOrder(items => arrayMove(items, oldIndex, newIndex));
  };

  /* ---------------- Search ---------------- */
  const fetchUsers = async (queryStr: string) => {
    if (!queryStr.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchUsers(queryStr);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    }
  };

  const debouncedSearch = useMemo(() => debounce(fetchUsers, 300), []);
  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [debouncedSearch, searchQuery]);

  /* ---------------- Create new chat ---------------- */
  const handleSelectUser = (user: UserSearchResult) => {
    const newChat: Chat = {
      id: user.id,
      name: user.name,
      avatar: user.avatar_url || "",
      lastMessage: "",
      favorite: false,
      date: new Date().toISOString(),
    };
    setChatList(prev => [...prev, newChat]);
    setChatOrder(prev => [...prev, newChat.id]);
    onChatCreate(newChat); // ← уведомляем родителя
    setActiveChatId(user.id);
    setNewChatMode(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  /* ---------------- Actions ---------------- */
  const toggleFavorite = (chatId: string) => {
    setChatList(prev => prev.map(c => c.id === chatId ? { ...c, favorite: !c.favorite } : c));
  };

  const toggleMute = (chatId: string) => {
    setChatList(prev => prev.map(c => c.id === chatId ? { ...c, muted: !c.muted } : c));
  };

  const archiveChat = (chatId: string) => {
    setChatList(prev => prev.map(c => c.id === chatId ? { ...c, archived: true } : c));
    if (activeChatId === chatId) setActiveChatId(null);
  };

  const deleteChat = (chatId: string) => {
    setChatList(prev => prev.filter(c => c.id !== chatId));
    setChatOrder(prev => prev.filter(id => id !== chatId));
    if (activeChatId === chatId) setActiveChatId(null);
  };

  const handleAction = (action: "favorite" | "mute" | "archive" | "delete", chat: Chat) => {
    switch (action) {
      case "favorite": toggleFavorite(chat.id); break;
      case "mute": toggleMute(chat.id); break;
      case "archive": archiveChat(chat.id); break;
      case "delete":
        if (confirm(`Удалить чат "${chat.name}"? Это действие необратимо.`)) {
          deleteChat(chat.id);
        }
        break;
    }
  };

  /* ---------------- Render ---------------- */
  const renderByOrder = (list: Chat[]) =>
    chatOrder
      .filter(id => list.some(c => c.id === id))
      .map(id => {
        const chat = chatList.find(c => c.id === id)!;
        return (
          <SortableWrapper
            key={chat.id}
            chat={chat}
            activeChat={activeChatId}
            setActiveChat={setActiveChatId}
            onAction={handleAction}
          />
        );
      });

  const archivedChats = chatList.filter(c => c.archived);

  return (
    <div className="flex flex-col h-full w-80 min-w-[260px] max-w-[420px] p-4 gap-4 bg-surface dark:bg-dark-surface">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-text-dark dark:text-white">Чаты</h2>
        <div className="flex gap-2 items-center">
          <button className="p-2 rounded-xl hover:bg-surface-hover dark:hover:bg-dark-hover transition">
            <ArrowUpNarrowWide className="w-5 h-5 text-text-dark dark:text-white" />
          </button>
          <button
            className="p-2 rounded-xl text-text-dark hover:bg-surface-hover dark:hover:bg-dark-hover transition"
            onClick={() => setNewChatMode(v => !v)}
          >
            <MessageCirclePlus className="w-5 h-5 text-text-dark dark:text-white" />
          </button>
          <button
            className={`ml-2 px-2 py-1 rounded-md text-sm ${showArchived ? "bg-primary/10" : "bg-white dark:bg-dark-input"} border border-border text-text-dark dark:border-dark-border`}
            onClick={() => setShowArchived(v => !v)}
            title="Показать архив"
          >
            {showArchived ? "Архив: Вкл" : "Показать архив"}
          </button>
        </div>
      </div>

      {/* New Chat Input */}
      <AnimatePresence>
        {newChatMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-1 mb-2"
          >
            <input
              type="text"
              placeholder="Поиск пользователя..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full p-2 rounded-xl border border-border dark:border-dark-border bg-white dark:bg-dark-input text-text-dark dark:text-dark-text-light placeholder:text-text-muted dark:placeholder:text-dark-text-muted focus:ring-2 focus:ring-primary-hover focus:border-primary-hover outline-none transition-all"
            />

            <Transition
              show={searchResults.length > 0}
              as={Fragment}
              enter="transition ease-out duration-150"
              enterFrom="opacity-0 translate-y-1 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-1 scale-95"
            >
              <div className="absolute w-full mt-1 rounded-xl border border-border dark:border-dark-border bg-white dark:bg-dark-input shadow-lg overflow-hidden z-50">
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    className="w-full px-3 py-2 flex items-center gap-3 text-left transition hover:bg-surface-hover dark:hover:bg-dark-hover"
                    onClick={() => handleSelectUser(u)}
                  >
                    <img
                      src={u.avatar_url || "/default-avatar.png"}
                      className="w-10 h-10 rounded-full object-cover bg-gray-300 dark:bg-gray-700"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-dark dark:text-white">
                        {u.name}
                      </span>
                      {u.email && (
                        <span className="text-xs text-text-muted dark:text-dark-text-muted">
                          {u.email}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </Transition>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
      >
        <SortableContext items={chatOrder} strategy={verticalListSortingStrategy}>
          <div className="flex-1 overflow-y-auto flex flex-col gap-6 pr-2">
            <Section title="Избранное" open={showFavorites} toggle={() => setShowFavorites(!showFavorites)}>
              {favorites.length === 0 ? <Empty text="Нет избранных чатов" /> : renderByOrder(favorites)}
            </Section>
            <Section title="Последние" open={showRecent} toggle={() => setShowRecent(!showRecent)}>
              {renderByOrder(recent.today)}
              {renderByOrder(recent.yesterday)}
              {renderByOrder(recent.earlier)}
            </Section>
            {showArchived && (
              <Section title="Архив" open={true} toggle={() => setShowArchived(v => !v)}>
                {archivedChats.length === 0 ? <Empty text="Архив пуст" /> : archivedChats.map(c => (
                  <SortableWrapper
                    key={c.id}
                    chat={c}
                    activeChat={activeChatId}
                    setActiveChat={setActiveChatId}
                    onAction={handleAction}
                  />
                ))}
              </Section>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

/* ---------------- Section ---------------- */
function Section({ title, open, toggle, children }: { title: string; open: boolean; toggle: () => void; children: React.ReactNode }) {
  return (
    <div>
      <button onClick={toggle} className="flex items-center w-full mb-2 gap-3 group">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted dark:text-dark-text-muted">{title}</span>
        <div className="flex-1 border-t border-border dark:border-dark-border" />
        {open ? <ChevronUp className="w-4 h-4 text-text-muted dark:text-dark-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted dark:text-dark-text-muted" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="flex flex-col gap-1">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Empty ---------------- */
function Empty({ text }: { text: string }) {
  return <div className="text-xs text-text-muted dark:text-dark-text-muted p-2 ml-1">{text}</div>;
}