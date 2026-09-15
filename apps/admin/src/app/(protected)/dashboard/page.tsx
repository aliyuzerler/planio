"use client";

import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { QueryState } from "@/components/ui/query-state";
import { useAdminDashboard } from "@/lib/admin/admin-queries";
import {
  BILLING_PERIOD_LABELS,
  BUSINESS_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from "@/lib/admin/labels";

export default function AdminDashboardPage() {
  const metrics = useAdminDashboard();

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Platform göstergesi"
        description="Sayılar canlı veritabanı kayıtlarından gelir. Tahmini gelir veya dönüşüm üretilmez."
      />
      <QueryState
        isLoading={metrics.isLoading}
        isError={metrics.isError}
        loading="Gösterge yükleniyor…"
        error="Gösterge bilgileri yüklenemedi."
      >
        {metrics.data ? (
          <div className="mt-6 space-y-8">
            <section aria-label="İşletmeler">
              <h2 className="text-lg font-semibold">İşletmeler</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Toplam" value={metrics.data.businesses.total} />
                {(["ACTIVE", "SUSPENDED", "CLOSED"] as const).map((status) => (
                  <StatCard
                    key={status}
                    label={BUSINESS_STATUS_LABELS[status]}
                    value={metrics.data.businesses[status]}
                  />
                ))}
              </div>
            </section>
            <section aria-label="Abonelik kayıtları">
              <h2 className="text-lg font-semibold">Abonelik kayıtları</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Toplam" value={metrics.data.subscriptions.total} />
                {(
                  [
                    "TRIALING",
                    "ACTIVE",
                    "PAST_DUE",
                    "PAUSED",
                    "CANCELLED",
                    "EXPIRED",
                  ] as const
                ).map((status) => (
                  <StatCard
                    key={status}
                    label={SUBSCRIPTION_STATUS_LABELS[status]}
                    value={metrics.data.subscriptions[status]}
                  />
                ))}
              </div>
            </section>
            <section aria-label="Lisanslar">
              <h2 className="text-lg font-semibold">Lisanslar</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Deneme, aktif, gecikmiş ve duraklatılmış abonelikler dönemine göre. Tenant kasa ve satış verisi burada yoktur.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Toplam" value={metrics.data.licenses.total} />
                <StatCard
                  label={BILLING_PERIOD_LABELS.MONTHLY}
                  value={metrics.data.licenses.MONTHLY}
                />
                <StatCard
                  label={BILLING_PERIOD_LABELS.SEMIANNUAL}
                  value={metrics.data.licenses.SEMIANNUAL}
                />
                <StatCard
                  label={BILLING_PERIOD_LABELS.YEARLY}
                  value={metrics.data.licenses.YEARLY}
                />
              </div>
            </section>
            <section aria-label="Kullanıcılar ve ödemeler">
              <h2 className="text-lg font-semibold">Kullanıcılar ve ödemeler</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Kullanıcı" value={metrics.data.users.total} />
                <StatCard label="Ödeme kayıtları" value={metrics.data.payments.total} />
                <StatCard
                  label={PAYMENT_STATUS_LABELS.SUCCEEDED}
                  value={metrics.data.payments.SUCCEEDED}
                />
                <StatCard
                  label={PAYMENT_STATUS_LABELS.FAILED}
                  value={metrics.data.payments.FAILED}
                />
              </div>
            </section>
          </div>
        ) : null}
      </QueryState>
    </PageFrame>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </article>
  );
}
