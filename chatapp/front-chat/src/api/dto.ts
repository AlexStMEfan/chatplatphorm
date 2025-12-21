export type BackendUserDTO = {
  id: string;
  name: string;
  avatar?: string;
};

export type BackendMessageDTO = {
  id: string;
  chat_id: string;
  text?: string;
  created_at: string;
  user: BackendUserDTO;

  file?: {
    name: string;
    size: number;
    type: "image" | "file" | "link";
    url: string;
  };
};