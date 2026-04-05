import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: number;
  username: string;
  email: string;
  total_score: number;
  current_hp: number;
  league: string;
  total_attacks_faced: number;
  total_attacks_blocked: number;
  is_admin?: boolean;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem("token", token);
        set({ user, token });
      },
      updateUser: (data) => set((s) => ({ user: s.user ? { ...s.user, ...data } : null })),
      logout: () => {
        localStorage.removeItem("token");
        set({ user: null, token: null });
      },
    }),
    { name: "auth-store" }
  )
);
