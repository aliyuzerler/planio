"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { planioDisplay, planioSans } from "@/lib/fonts/planio";
import { useAuthStore } from "@/stores/auth-store";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status !== "authenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-sm text-[#5a7380]">
        Oturum doğrulanıyor…
      </main>
    );
  }

  if (pathname === "/select-business") {
    return (
      <div className={`${planioDisplay.variable} ${planioSans.variable}`}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={`${planioDisplay.variable} ${planioSans.variable}`}
      style={{ fontFamily: "var(--font-planio-sans), sans-serif" }}
    >
      <AppShell>{children}</AppShell>
    </div>
  );
}
