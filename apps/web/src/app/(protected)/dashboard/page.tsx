"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  Users,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { QueryState } from "@/components/ui/query-state";
import { usePageTitle } from "@/lib/use-page-title";
import { AppointmentStatusBadge } from "@/app/(protected)/settings/_components/appointment-status-badge";
import { useDashboardOverview } from "@/lib/dashboard/dashboard-queries";
import { useAuthStore } from "@/stores/auth-store";
import type { AppointmentRecord } from "@xenior/types";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

export default function DashboardPage() {
  usePageTitle("Gösterge");
  const router = useRouter();
  const selectedBusinessId = useAuthStore((state) => state.selectedBusinessId);
  const role = useAuthStore((state) =>
    state.memberships.find((item) => item.businessId === state.selectedBusinessId)
      ?.role,
  );
  const overview = useDashboardOverview();

  useEffect(() => {
    if (!selectedBusinessId) router.replace("/select-business");
  }, [router, selectedBusinessId]);

  if (!selectedBusinessId) {
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">İşletme seçimi doğrulanıyor…</p>
      </PageFrame>
    );
  }

  if (role === "ACCOUNTANT") {
    return (
      <PageFrame>
        <PageHeader
          title="Muhasebe"
          description="Kasa, satış, tahsilat, cari, gider, fiş ve günlük rapor bu hesaba açık. Randevu ve katalog yazımı kapalıdır."
        />
        <div className="mt-6 rounded-2xl border border-[#c5dde6]/80 bg-white p-6 text-sm leading-6 text-[#5a7380] shadow-sm">
          Randevu, personel, hizmet ve bildirim menüleri muhasebe rolüne kapalıdır.
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-[#3d6b7a]">
          {[
            ["/settings/sales", "Satışlar"],
            ["/settings/cash", "Kasa"],
            ["/settings/ledger", "Cari"],
            ["/settings/expenses", "Giderler"],
            ["/settings/earnings", "Hakediş"],
            ["/settings/reports", "Raporlar"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg bg-[#eef6f8] px-3 py-1.5 transition hover:bg-[#e4f0f4]"
            >
              {label}
            </Link>
          ))}
        </div>
      </PageFrame>
    );
  }

  const nextTodayHint = overview.nextTodayAppointment
    ? `Sıradaki ${formatTime(overview.nextTodayAppointment.startAt)} · ${personName(overview.nextTodayAppointment.customer)}`
    : overview.todayCount > 0
      ? `${overview.todayConfirmed} onaylı · ${overview.todayCompletedLocal} tamamlandı`
      : "Bugün için plan yok";

  const upcomingHint = overview.nextUpcomingAppointment
    ? `İlk ${formatDateTime(overview.nextUpcomingAppointment.startAt)}`
    : "14 günlük pencerede yok";

  return (
    <PageFrame width="lg" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Operasyon özeti
          </p>
          <h1
            className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
            style={displayFont}
          >
            Gösterge paneli
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
            Bugünün randevu ritmi, yaklaşan planlar ve ekip/müşteri özeti. Detaylı
            kasa ve finans için Raporlar sayfasına gidin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings/appointments"
            className="inline-flex items-center gap-2 rounded-xl bg-[#3d7a8c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a]"
          >
            Randevu takvimi
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/settings/reports"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5563] shadow-sm ring-1 ring-[#c5dde6]/80 transition hover:bg-[#eef6f8]"
          >
            Raporlar
          </Link>
        </div>
      </div>

      <QueryState
        isLoading={overview.isLoading}
        isError={overview.isError}
        loading="Gösterge yükleniyor…"
        error="Gösterge bilgileri yüklenemedi."
      >
        <section
          aria-label="Operasyon özeti"
          className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <StatCard
            label="Bugünkü randevular"
            value={overview.todayCount}
            hint={nextTodayHint}
            icon={Calendar}
            tone="teal"
            href="/settings/appointments"
          />
          <StatCard
            label="Yaklaşan randevular"
            value={overview.upcomingCount}
            hint={upcomingHint}
            icon={CalendarClock}
            tone="blue"
            href="/settings/appointments"
          />
          <StatCard
            label="Tamamlanan randevular"
            value={overview.completedCount}
            hint="Bugün tamamlanan işlemler"
            icon={CalendarCheck2}
            tone="mint"
            href="/settings/appointments"
          />
          <StatCard
            label="İptal edilen randevular"
            value={overview.cancelledCount}
            hint="Bugün iptal edilen kayıtlar"
            icon={CalendarX2}
            tone="slate"
            href="/settings/appointments"
          />
          <StatCard
            label="Müşteri sayısı"
            value={overview.customerCount}
            hint="Kayıtlı müşteri kartları"
            icon={Users}
            tone="teal"
            href="/settings/customers"
          />
          <StatCard
            label="Personel sayısı"
            value={overview.staffCount}
            hint="Aktif ekip üyeleri"
            icon={UserRound}
            tone="blue"
            href="/settings/staff"
          />
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-5">
          <Panel
            className="xl:col-span-3"
            title="Bugünün randevuları"
            description={`${formatYmdLabel(overview.today)} · ${overview.todayCount} kayıt`}
            actionHref="/settings/appointments"
            actionLabel="Takvime git"
          >
            {overview.todayAppointments.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Bugün için randevu yok"
                body="Boş bir slot oluşturmak için takvimi açın."
              />
            ) : (
              <ul className="divide-y divide-[#e4f0f4]">
                {overview.todayAppointments.map((item) => (
                  <AppointmentRow key={item.id} item={item} mode="today" />
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            className="xl:col-span-2"
            title="Yaklaşan randevular"
            description="Önümüzdeki 14 gün · onaylı"
            actionHref="/settings/appointments"
            actionLabel="Tümü"
          >
            {overview.upcomingAppointments.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Yaklaşan onaylı randevu yok"
                body="14 günlük pencerede planlanmış onaylı kayıt bulunmuyor."
              />
            ) : (
              <ul className="divide-y divide-[#e4f0f4]">
                {overview.upcomingAppointments.slice(0, 8).map((item) => (
                  <AppointmentRow key={item.id} item={item} mode="upcoming" />
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <MiniInsight
            icon={CheckCircle2}
            label="Bugün onaylı"
            value={overview.todayConfirmed}
            note="Bekleyen / gelecek slotlar"
          />
          <MiniInsight
            icon={CalendarCheck2}
            label="Bugün tamamlandı"
            value={overview.todayCompletedLocal}
            note="İşlemi biten randevular"
          />
          <MiniInsight
            icon={CalendarX2}
            label="Bugün iptal"
            value={overview.todayCancelledLocal}
            note="İptal edilen kayıtlar"
          />
        </section>
      </QueryState>
    </PageFrame>
  );
}

type Tone = "teal" | "blue" | "mint" | "slate";

const TONE_STYLES: Record<
  Tone,
  { iconWrap: string; icon: string; value: string; accent: string }
> = {
  teal: {
    iconWrap: "bg-[#b8e6df]/45",
    icon: "text-[#3d6b7a]",
    value: "text-[#2f5563]",
    accent: "from-[#7eb8c8]/25 to-transparent",
  },
  blue: {
    iconWrap: "bg-[#98b5d7]/30",
    icon: "text-[#3d6b7a]",
    value: "text-[#2f5563]",
    accent: "from-[#98b5d7]/25 to-transparent",
  },
  mint: {
    iconWrap: "bg-[#b8e6df]/55",
    icon: "text-[#2f5563]",
    value: "text-[#2f5563]",
    accent: "from-[#b8e6df]/40 to-transparent",
  },
  slate: {
    iconWrap: "bg-[#e4f0f4]",
    icon: "text-[#5a7380]",
    value: "text-[#2f5563]",
    accent: "from-[#5a7380]/10 to-transparent",
  },
};

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone: Tone;
  href: string;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#c5dde6]/70 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${styles.accent}`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-[#5a7380]">{label}</p>
          <p
            className={`mt-2 text-3xl font-semibold tracking-tight ${styles.value}`}
            style={displayFont}
          >
            {value}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles.iconWrap}`}
        >
          <Icon className={`h-5 w-5 ${styles.icon}`} />
        </span>
      </div>
      <p className="relative mt-3 line-clamp-2 text-[13px] leading-5 text-[#5a7380]">
        {hint}
      </p>
      <span className="relative mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-[#3d6b7a] opacity-80 transition group-hover:opacity-100">
        Detaya git
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function Panel({
  title,
  description,
  actionHref,
  actionLabel,
  children,
  className = "",
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
        <div>
          <h2
            className="text-lg font-semibold text-[#2f5563]"
            style={displayFont}
          >
            {title}
          </h2>
          <p className="mt-0.5 text-[13px] text-[#5a7380]">{description}</p>
        </div>
        <Link
          href={actionHref}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="px-2 sm:px-3">{children}</div>
    </section>
  );
}

function AppointmentRow({
  item,
  mode,
}: {
  item: AppointmentRecord;
  mode: "today" | "upcoming";
}) {
  return (
    <li>
      <Link
        href={`/settings/appointments/${item.id}`}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-[#eef6f8]"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="w-14 shrink-0 pt-0.5 text-[13px] font-bold text-[#3d6b7a]">
            {mode === "today"
              ? formatTime(item.startAt)
              : formatShortDate(item.startAt)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-[#1e3340]">
              {personName(item.customer)}
            </p>
            <p className="mt-0.5 truncate text-[13px] text-[#5a7380]">
              {item.serviceNameSnapshot}
              {" · "}
              {personName(item.staff)}
            </p>
            {mode === "upcoming" ? (
              <p className="mt-1 text-[12px] font-medium text-[#7eb8c8]">
                {formatTime(item.startAt)}
              </p>
            ) : null}
          </div>
        </div>
        <AppointmentStatusBadge status={item.status} />
      </Link>
    </li>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef6f8] text-[#7eb8c8]">
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-[15px] font-semibold text-[#2f5563]">{title}</p>
      <p className="mt-1 max-w-xs text-[13px] leading-5 text-[#5a7380]">{body}</p>
    </div>
  );
}

function MiniInsight({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="rounded-2xl bg-[#eef6f8]/80 px-5 py-4 ring-1 ring-[#c5dde6]/60">
      <div className="flex items-center gap-2 text-[#3d6b7a]">
        <Icon className="h-4 w-4" />
        <span className="text-[13px] font-semibold">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-[#2f5563]" style={displayFont}>
        {value}
      </p>
      <p className="mt-1 text-[12px] text-[#5a7380]">{note}</p>
    </div>
  );
}

function personName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
  });
}

function formatYmdLabel(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
