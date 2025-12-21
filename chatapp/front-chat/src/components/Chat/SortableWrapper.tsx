import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Chat } from "./types";
import SortableChatItem from "./SortableChatItem";

interface SortableWrapperProps {
  chat: Chat;
  activeChat: string | null;
  setActiveChat: (id: string) => void;
  onAction: (action: "favorite" | "mute" | "archive" | "delete", chat: Chat) => void;
}

export default function SortableWrapper({ chat, activeChat, setActiveChat, onAction }: SortableWrapperProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chat.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <SortableChatItem
      chat={chat}
      activeChat={activeChat}
      setActiveChat={setActiveChat}
      listeners={listeners}
      attributes={attributes}
      setNodeRef={setNodeRef}
      isDragging={isDragging}
      style={style}
      onAction={onAction}
    />
  );
}