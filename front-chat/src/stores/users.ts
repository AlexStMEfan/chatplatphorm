import { create } from "zustand";
import type { User } from "../types/user";

type UsersState = {
  users: Record<string, User>;
  upsertUsers: (users: User[]) => void;
  upsertUser: (user: User) => void;
  getUserById: (id: string) => User | undefined;
};

export const useUsersStore = create<UsersState>((set, get) => ({
  users: {},

  upsertUsers: (users) =>
    set((state) => {
      const map = { ...state.users };
      users.forEach((u) => {
        map[u.id] = u;
      });
      return { users: map };
    }),

  upsertUser: (user) =>
    set((state) => ({
      users: {
        ...state.users,
        [user.id]: user,
      },
    })),

  getUserById: (id) => get().users[id],
}));