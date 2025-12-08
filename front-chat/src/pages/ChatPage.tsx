// src/pages/ChatPage.tsx
import { Outlet, useOutletContext } from "react-router-dom";
import { useState } from "react";
import type { Chat } from "../components/Chat/types";
import SideBar from "../components/Sidebar/LeftSidebar";
import Header from "../components/Header";

const initialChats: Chat[] = [ /* ... */ ];

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const handleChatCreate = (chat: Chat) => {
    setChats(prev => [...prev, chat]);
  };

  // Передаём состояние в дочерние маршруты
  return (
    <div className="h-screen w-screen flex flex-col bg-background dark:bg-dark-background">
      <Header />
      <div className="flex flex-1 relative">
        <div className="w-25 flex flex-col items-center py-4 z-10">
          <SideBar />
        </div>
        <div className="flex-1 relative z-20">
          <Outlet context={{ chats, activeChatId, setActiveChatId, handleChatCreate }} />
        </div>
      </div>
    </div>
  );
}

// Хук для использования контекста в дочерних компонентах
export function useChatContext() {
  return useOutletContext<{
    chats: Chat[];
    activeChatId: string | null;
    setActiveChatId: (id: string | null) => void;
    handleChatCreate: (chat: Chat) => void;
  }>();
}