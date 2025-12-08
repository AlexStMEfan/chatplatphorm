// Chat/types.ts

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string; // добавлено
}

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

export interface ChatListProps {
  chats: Chat[];
  activeChatId?: string | null;
  setActiveChatId?: React.Dispatch<React.SetStateAction<string | null>>;
}

// Расширяем Message
export interface Message {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  sender: User;
  readBy?: ReadByUser[]; 
  reactions?: MessageReaction[]; 
  fileMeta?: MessageFileMeta;
  createdAt?: string;
  timestamp?: string;
}

// Для реакций
export interface MessageReaction {
  emoji: string;
  count: number;
  reactedBy?: string[]; // массив userId, кто поставил реакцию
}

// Для прочитавших сообщение
export interface ReadByUser {
  id: string;
  avatar?: string;
}

export interface MessageFileMeta {
  name: string;
  size: number;
  type: string;
  messageType: "image" | "file" | "audio" | "video" | "other";
}
