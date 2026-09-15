"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAccountantAllowedPath } from "@/components/layout/nav-items";
import { useAuthStore } from "@/stores/auth-store";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const selectedBusinessId = useAuthStore((state) => state.selectedBusinessId);
  const role = useAuthStore((state) =>
    state.memberships.find((item) => item.businessId === state.selectedBusinessId)
      ?.role,
  );

  useEffect(() => {
    if (!selectedBusinessId) router.replace("/select-business");
  }, [router, selectedBusinessId]);

  useEffect(() => {
    if (role === "ACCOUNTANT" && !isAccountantAllowedPath(pathname)) {
      router.replace("/dashboard");
    }
  }, [pathname, role, router]);

  if (!selectedBusinessId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-600">
        İşletme seçimi doğrulanıyor…
      </div>
    );
  }

  return children;
}
