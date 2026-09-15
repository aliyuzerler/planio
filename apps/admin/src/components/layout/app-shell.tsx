"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, cn } from "@xenior/ui";
import { Menu, X } from "lucide-react";
import { PlanioLogo } from "@/components/brand/planio-logo";
import { APP_NAV_ITEMS, isNavItemActive } from "@/components/layout/nav-items";
import { logout } from "@/lib/auth/auth-api";
import { useAuthStore } from "@/stores/auth-store";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearSession();
      router.replace("/login");
    }
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-30 bg-zinc-950/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-4">
          <Link href="/dashboard" aria-label="Planio Admin" className="flex min-w-0 items-center gap-2">
            <PlanioLogo className="h-7" />
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Admin
            </span>
          </Link>
          <button
            type="button"
            className="rounded-md p-1 lg:hidden"
            aria-label="Kenar çubuğunu kapat"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav aria-label="Platform menüsü" className="flex flex-1 flex-col gap-1 px-3 pb-4">
          {APP_NAV_ITEMS.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm",
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-700 hover:bg-zinc-100",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-md border border-zinc-200 p-2 lg:hidden"
              aria-label="Menüyü aç"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Platform yönetimi</p>
              <p className="truncate text-xs text-zinc-500">SUPER_ADMIN</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-zinc-600 sm:block">
              {user?.email}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleLogout()}>
              Çıkış yap
            </Button>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
