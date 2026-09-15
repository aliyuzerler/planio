"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { isSuperAdmin } from "@/lib/auth/platform-admin";
import { logout } from "@/lib/auth/auth-api";
import { useAuthStore } from "@/stores/auth-store";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && !isSuperAdmin(user?.platformRole)) {
      clearSession();
      void logout().catch(() => undefined);
      router.replace("/login");
    }
  }, [clearSession, router, status, user?.platformRole]);

  if (status !== "authenticated" || !isSuperAdmin(user?.platformRole)) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-sm text-zinc-600">
        Oturum doğrulanıyor…
      </main>
    );
  }

  return <AppShell>{children}</AppShell>;
}
