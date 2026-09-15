"use client";

import { create } from "zustand";
import type { AuthUser } from "@xenior/types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  setSession: (user: AuthUser, accessToken: string) => void;
  updateAccessToken: (accessToken: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  user: null,
  accessToken: null,
  setSession: (user, accessToken) =>
    set({
      status: "authenticated",
      user,
      accessToken,
    }),
  updateAccessToken: (accessToken) => set({ accessToken }),
  clearSession: () =>
    set({
      status: "anonymous",
      user: null,
      accessToken: null,
    }),
}));
