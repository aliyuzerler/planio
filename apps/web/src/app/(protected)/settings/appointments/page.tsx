"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, CalendarPlus } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { useSubscriptionAccess } from "@/lib/subscriptions/subscription-queries";
import { usePageTitle } from "@/lib/use-page-title";

// 800+ satırlık sürükle-bırak takvimi yalnızca bu sayfada kullanılır; ilk
// yükleme JS'inden çıkarılır (code-split).
const AppointmentCalendar = dynamic(
  () =>
    import(
      "@/app/(protected)/settings/_components/appointment-calendar"
    ).then((mod) => mod.AppointmentCalendar),
  {
    loading: () => (
      <p className="rounded-2xl bg-white p-6 text-sm text-[#5a7380] ring-1 ring-[#c5dde6]/70">
        Takvim yükleniyor…
      </p>
    ),
  },
);

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

export default function AppointmentsPage() {
  usePageTitle("Randevular");
  const access = useSubscriptionAccess();
  const canWrite = access.data?.hasAccess !== false;

  return (
    <PageFrame width="lg" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Operasyon
          </p>
          <h1
            className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
            style={displayFont}
          >
            Randevular
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
            Gün, hafta ve ay görünümünde planlayın. Randevuyu sürükleyerek
            taşıyabilirsiniz; çakışma ve slot geçerliliği sunucuda kontrol edilir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite ? (
            <Link
              href="/settings/appointments/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#3d7a8c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a]"
            >
              <CalendarPlus className="h-4 w-4" />
              Yeni randevu
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="/settings/subscription"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5563] shadow-sm ring-1 ring-[#c5dde6]/80 transition hover:bg-[#eef6f8]"
            >
              Aboneliği yenile
            </Link>
          )}
        </div>
      </div>

      <AppointmentCalendar />
    </PageFrame>
  );
}
