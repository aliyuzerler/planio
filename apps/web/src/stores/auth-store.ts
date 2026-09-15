"use client";

import { create } from "zustand";
import type { AuthMembership, AuthUser } from "@xenior/types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  memberships: AuthMembership[];
  selectedBusinessId: string | null;
  accessToken: string | null;
  setSession: (
    user: AuthUser,
    accessToken: string,
    memberships?: AuthMembership[],
  ) => void;
  updateAccessToken: (accessToken: string) => void;
  selectBusiness: (businessId: string) => boolean;
  updateBusinessName: (businessId: string, businessName: string) => void;
  clearSession: () => void;
}

const selectionStorageKey = "xenior.selectedBusinessId";

function selectableMemberships(memberships: AuthMembership[]) {
  return memberships.filter(
    (membership) =>
      membership.isActive && membership.businessStatus === "ACTIVE",
  );
}

function readStoredSelection(): string | null {
  return typeof window === "undefined"
    ? null
    : window.sessionStorage.getItem(selectionStorageKey);
}

function storeSelection(businessId: string | null): void {
  if (typeof window === "undefined") return;
  if (businessId) {
    window.sessionStorage.setItem(selectionStorageKey, businessId);
  } else {
    window.sessionStorage.removeItem(selectionStorageKey);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  user: null,
  memberships: [],
  selectedBusinessId: null,
  accessToken: null,
  setSession: (user, accessToken, memberships = []) => {
    const selectable = selectableMemberships(memberships);
    const stored = readStoredSelection();
    const selectedBusinessId =
      selectable.some((membership) => membership.businessId === stored)
        ? stored
        : selectable.length === 1
          ? selectable[0]!.businessId
          : null;
    storeSelection(selectedBusinessId);
    set({
      status: "authenticated",
      user,
      memberships,
      selectedBusinessId,
      accessToken,
    });
  },
  updateAccessToken: (accessToken) => set({ accessToken }),
  selectBusiness: (businessId) => {
    let accepted = false;
    set((state) => {
      accepted = selectableMemberships(state.memberships).some(
        (membership) => membership.businessId === businessId,
      );
      if (!accepted) return state;
      storeSelection(businessId);
      return { selectedBusinessId: businessId };
    });
    return accepted;
  },
  updateBusinessName: (businessId, businessName) =>
    set((state) => ({
      memberships: state.memberships.map((membership) =>
        membership.businessId === businessId
          ? { ...membership, businessName }
          : membership,
      ),
    })),
  clearSession: () =>
    set(() => {
      storeSelection(null);
      return {
        status: "anonymous",
        user: null,
        memberships: [],
        selectedBusinessId: null,
        accessToken: null,
      };
    }),
}));
