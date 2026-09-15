"use client";

import { useEffect, type ReactNode } from "react";
import {
  getSession,
  logout,
  type BrowserHydratedSession,
} from "@/lib/auth/auth-api";
import { useAuthStore } from "@/stores/auth-store";

let bootstrapInFlight: Promise<BrowserHydratedSession> | null = null;

function bootstrapSession(): Promise<BrowserHydratedSession> {
  bootstrapInFlight ??= getSession().finally(() => {
    bootstrapInFlight = null;
  });
  return bootstrapInFlight;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    let active = true;

    void bootstrapSession()
      .then((session) => {
        if (active) {
          setSession(
            session.user,
            session.accessToken,
            session.memberships,
          );
        }
      })
      .catch(() => {
        if (active) {
          clearSession();
          void logout().catch(() => undefined);
        }
      });

    return () => {
      active = false;
    };
  }, [clearSession, setSession]);

  return children;
}
