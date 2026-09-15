"use client";

import Link from "next/link";
import type { SubscriptionAccess } from "@xenior/types";

export function SubscriptionPaywallBanner({
  access,
}: {
  access: SubscriptionAccess | undefined;
}) {
  if (!access || access.hasAccess) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:px-6"
    >
      İşletme lisansının süresi doldu. Yazma ekranları kilitli.{" "}
      <Link href="/settings/subscription" className="font-medium underline">
        Abonelik sayfasına git
      </Link>
    </div>
  );
}
