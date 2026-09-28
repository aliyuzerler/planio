"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@xenior/ui";
import { ChevronDown, Menu, X } from "lucide-react";
import { PlanioLogo } from "@/components/brand/planio-logo";
import {
  BUSINESS_ROLE_LABELS,
  isNavItemActive,
  isSidebarFolderActive,
  sidebarSectionsForRole,
  type SidebarSection,
} from "@/components/layout/nav-items";
import { SubscriptionPaywallBanner } from "@/components/layout/subscription-paywall-banner";
import { logout } from "@/lib/auth/auth-api";
import { isSubscriptionWritePath } from "@/lib/subscriptions/subscription-write-paths";
import { useSubscriptionAccess } from "@/lib/subscriptions/subscription-queries";
import { useAuthStore } from "@/stores/auth-store";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const memberships = useAuthStore((state) => state.memberships);
  const selectedBusinessId = useAuthStore((state) => state.selectedBusinessId);
  const clearSession = useAuthStore((state) => state.clearSession);
  const access = useSubscriptionAccess();
  const business = memberships.find(
    (membership) => membership.businessId === selectedBusinessId,
  );
  const sections = useMemo(
    () => sidebarSectionsForRole(business?.role),
    [business?.role],
  );
  const [folderState, setFolderState] = useState<{
    pathname: string;
    overrides: Record<string, boolean>;
  }>({ pathname, overrides: {} });

  if (folderState.pathname !== pathname) {
    setFolderState({ pathname, overrides: {} });
  }

  useEffect(() => {
    if (access.data && !access.data.hasAccess && isSubscriptionWritePath(pathname)) {
      router.replace("/settings/subscription");
    }
  }, [access.data, pathname, router]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearSession();
      router.replace("/login");
    }
  }

  function isFolderOpen(section: SidebarSection) {
    if (section.kind !== "folder") return false;
    if (section.id in folderState.overrides) {
      return folderState.overrides[section.id]!;
    }
    return isSidebarFolderActive(pathname, section.children);
  }

  function toggleFolder(section: SidebarSection) {
    if (section.kind !== "folder") return;
    const nextOpen = !isFolderOpen(section);
    setFolderState((current) => ({
      ...current,
      overrides: { ...current.overrides, [section.id]: nextOpen },
    }));
  }

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-[#F7FBFC] text-[#1e3340]">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-30 bg-[#1e3340]/40 lg:hidden"
          onClick={closeMobile}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#c5dde6]/70 bg-[#eef6f8] transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-start justify-between gap-2 border-b border-[#c5dde6]/60 px-5 py-4">
          <div className="min-w-0">
            <Link href="/dashboard" aria-label="Planio" className="inline-flex">
              <PlanioLogo className="h-7" />
            </Link>
            <p className="mt-2 truncate text-sm font-semibold text-[#2f5563]">
              {business?.businessName ?? "İşletme"}
            </p>
            <p className="truncate text-[12px] font-medium text-[#5a7380]">
              {business?.role ? BUSINESS_ROLE_LABELS[business.role] : ""}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-[#5a7380] hover:bg-[#e4f0f4] lg:hidden"
            aria-label="Kenar çubuğunu kapat"
            onClick={closeMobile}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav
          aria-label="Uygulama menüsü"
          className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
        >
          {sections.map((section) => (
            <SidebarEntry
              key={section.id}
              section={section}
              pathname={pathname}
              open={isFolderOpen(section)}
              onToggle={() => toggleFolder(section)}
              onNavigate={closeMobile}
            />
          ))}
        </nav>

        <div className="border-t border-[#c5dde6]/60 px-4 py-3">
          <p className="truncate text-[12px] text-[#5a7380]">{user?.email}</p>
          <button
            type="button"
            className="mt-2 w-full rounded-xl border border-[#c5dde6] bg-white px-3 py-2 text-[13px] font-semibold text-[#3d6b7a] transition hover:bg-[#e4f0f4]"
            onClick={() => void handleLogout()}
          >
            Çıkış yap
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#c5dde6]/70 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:hidden">
          <button
            type="button"
            className="rounded-lg border border-[#c5dde6] p-2 text-[#3d6b7a]"
            aria-label="Menüyü aç"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#2f5563]">
              {business?.businessName ?? "İşletme"}
            </p>
            <p className="truncate text-[12px] text-[#5a7380]">
              {business?.role ? BUSINESS_ROLE_LABELS[business.role] : ""}
            </p>
          </div>
        </header>
        <SubscriptionPaywallBanner access={access.data} />
        <main className="flex-1 bg-white lg:bg-transparent">{children}</main>
      </div>
    </div>
  );
}

function SidebarEntry({
  section,
  pathname,
  open,
  onToggle,
  onNavigate,
}: {
  section: SidebarSection;
  pathname: string;
  open: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  if (section.kind === "link") {
    const active = isNavItemActive(pathname, section.href);
    return (
      <Link
        href={section.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "rounded-lg px-3 py-2.5 text-[14px] font-semibold transition-colors",
          active
            ? "bg-[#7eb8c8]/20 text-[#2f5563]"
            : "text-[#3d6b7a] hover:bg-[#e4f0f4]",
        )}
      >
        {section.label}
      </Link>
    );
  }

  const folderActive = isSidebarFolderActive(pathname, section.children);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[14px] font-semibold transition-colors",
          folderActive || open
            ? "bg-[#e4f0f4] text-[#2f5563]"
            : "text-[#3d6b7a] hover:bg-[#e4f0f4]",
        )}
      >
        <span>{section.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[#7eb8c8] transition-transform",
            open ? "rotate-180" : "",
          )}
        />
      </button>
      {open ? (
        <div className="mt-0.5 ml-2 space-y-0.5 border-l border-[#c5dde6] pl-2">
          {section.children.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-[#7eb8c8]/25 font-semibold text-[#2f5563]"
                    : "text-[#5a7380] hover:bg-[#e4f0f4] hover:text-[#2f5563]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
