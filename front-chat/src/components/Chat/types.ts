// Chat/types.ts

/** Пользователь (данные приходят из auth-сервиса / кэша) */
export interface User {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
}

/** Чат (элемент списка чатов) */
export interface Chat {
  id: string;
  name?: string;
  avatar?: string;
  lastMessage?: string;
  date: string; // ISO
  favorite?: boolean;
  muted?: boolean;
  archived?: boolean;
  isGroup?: boolean;
}

/** Props для списка чатов */
export interface ChatListProps {
  chats: Chat[];
  activeChatId?: string | null;
  setActiveChatId?: React.Dispatch<React.SetStateAction<string | null>>;
}

/** Реакция на сообщение */
export interface MessageReaction {
  emoji: string;
  count: number;
  reactedBy?: string[]; // userId
}

/** Метаданные файла */
export interface MessageFileMeta {
  name: string;
  size: number;
  type: string;
  messageType: "image" | "file" | "audio" | "video" | "other";
}

/**
 * UI-модель сообщения
 * ⚠️ НЕ равна backend ChatEvent
 */
export interface Message {
  /** message_id */
  id: string;

  /** chat_id */
  chatId: string;

  /** user_id (из Scylla / JWT) */
  userId: string;

  /** Текст сообщения */
  content?: string;

  /** Ссылки на медиа */
  mediaUrls?: string[];

  /**
   * Метаданные медиа
   * backend: serde_json::Value
   */
  mediaMeta?: MessageFileMeta;

  /** ISO дата создания */
  createdAt: string;

  editedAt?: string;
  isDeleted?: boolean;

  /** Данные отправителя (подтягиваются отдельно) */
  sender?: User;

  /** Реакции */
  reactions?: MessageReaction[];
  readBy?: string[];
}

/** Пользователь, прочитавший сообщение */
export interface ReadByUser {
  id: string;
  avatar?: string;
}

export interface ChatEvent {
  type: 'message' | 'reaction' | 'read';
  message_id: string;
  chat_id: string;
  user_id: string;
  content?: string;
  media_urls?: string[];
  media_meta?: {
    name?: string;
    size?: number;
    type?: string;
    messageType?: string;
    // ... другие поля, которые могут быть
  };
  created_at: string;
  edited_at?: string;
  is_deleted?: boolean;
}