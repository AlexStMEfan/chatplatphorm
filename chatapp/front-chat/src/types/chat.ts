export type User = {
  id: string;
  name: string;
  avatar?: string;
};

export type Reaction = {
  emoji: string;
  count: number;
  reactedBy: string[];
};

export type Message = {
  id: string;
  chatId: string;
  userId: string;
  sender: User;
  content: string;
  createdAt: string;

  reactions: Reaction[];
  readBy: string[];

  fileMeta?: {
    name: string;
    size: number;
    messageType: "image" | "file" | "link";
  };
};