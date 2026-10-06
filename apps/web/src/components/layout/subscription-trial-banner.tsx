"use client";

import Link from "next/link";
import type { SubscriptionRecord } from "@xenior/types";
import {
  TRIAL_WARNING_DAYS,
  trialDaysRemaining,
} from "@/lib/subscriptions/trial";

export function SubscriptionTrialBanner({
  subscription,
}: {
  subscription: SubscriptionRecord | null | undefined;
}) {
  if (!subscription || subscription.status !== "TRIALING") return null;

  const days = trialDaysRemaining(subscription.currentPeriodEnd);
  if (days > TRIAL_WARNING_DAYS) return null;

  const remaining =
    days <= 0 ? "bugün" : days === 1 ? "yarın" : `${days} gün içinde`;

  return (
    <div
      role="status"
      className="border-b border-[#9fd0dc] bg-[#eef6f8] px-4 py-3 text-sm text-[#2f5563] sm:px-6"
    >
      Deneme süreniz {remaining} doluyor. Tüm özelliklerinizi korumak için
      ücretli plana geçin.{" "}
      <Link href="/settings/subscription" className="font-medium underline">
        Abonelik sayfasına git
      </Link>
    </div>
  );
}
