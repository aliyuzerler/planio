"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { QueryState } from "@/components/ui/query-state";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { AppointmentStatusBadge } from "@/app/(protected)/settings/_components/appointment-status-badge";
import { useDashboardOverview } from "@/lib/dashboard/dashboard-queries";
import { useAuthStore } from "@/stores/auth-store";

export default function DashboardPage() {
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
        <p className="text-sm text-zinc-600">İşletme seçimi doğrulanıyor…</p>
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
        <p className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700">
          Randevu, personel, hizmet ve bildirim menüleri muhasebe rolüne kapalıdır.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/settings/sales" className="underline">
            Satışlar
          </Link>
          {" · "}
          <Link href="/settings/cash" className="underline">
            Kasa
          </Link>
          {" · "}
          <Link href="/settings/ledger" className="underline">
            Cari
          </Link>
          {" · "}
          <Link href="/settings/expenses" className="underline">
            Giderler
          </Link>
          {" · "}
          <Link href="/settings/earnings" className="underline">
            Hakediş
          </Link>
          {" · "}
          <Link href="/settings/reports" className="underline">
            Raporlar
          </Link>
        </p>
      </PageFrame>
    );
  }

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Gösterge paneli"
        description="Bugünün operasyon özeti. Günlük kasa ve finans özeti Raporlar sayfasındadır."
      />
      <QueryState
        isLoading={overview.isLoading}
        isError={overview.isError}
        loading="Gösterge yükleniyor…"
        error="Gösterge bilgileri yüklenemedi."
      >
        <section
          aria-label="Operasyon özeti"
          className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          <StatCard label="Bugünkü randevular" value={overview.todayCount} />
          <StatCard label="Yaklaşan randevular" value={overview.upcomingCount} />
          <StatCard label="Tamamlanan randevular" value={overview.completedCount} />
          <StatCard label="İptal edilen randevular" value={overview.cancelledCount} />
          <StatCard label="Müşteri sayısı" value={overview.customerCount} />
          <StatCard label="Personel sayısı" value={overview.staffCount} />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Bugünün randevuları</h2>
          {overview.todayAppointments.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">
              Bugün için randevu yok.
            </p>
          ) : (
            <DataTable caption="Bugünün randevuları">
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Saat</DataTableHeaderCell>
                  <DataTableHeaderCell>Müşteri</DataTableHeaderCell>
                  <DataTableHeaderCell>Personel</DataTableHeaderCell>
                  <DataTableHeaderCell>Hizmet</DataTableHeaderCell>
                  <DataTableHeaderCell>Durum</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {overview.todayAppointments.map((item) => (
                  <DataTableRow key={item.id}>
                    <DataTableCell>
                      <Link
                        href={`/settings/appointments/${item.id}`}
                        className="underline"
                      >
                        {new Date(item.startAt).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Link>
                    </DataTableCell>
                    <DataTableCell>
                      {item.customer.firstName} {item.customer.lastName}
                    </DataTableCell>
                    <DataTableCell>
                      {item.staff.firstName} {item.staff.lastName}
                    </DataTableCell>
                    <DataTableCell>{item.serviceNameSnapshot}</DataTableCell>
                    <DataTableCell>
                      <AppointmentStatusBadge status={item.status} />
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Yaklaşan randevular</h2>
          {overview.upcomingAppointments.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">
              Önümüzdeki 14 günde onaylı randevu yok.
            </p>
          ) : (
            <DataTable caption="Yaklaşan randevular">
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Tarih</DataTableHeaderCell>
                  <DataTableHeaderCell>Müşteri</DataTableHeaderCell>
                  <DataTableHeaderCell>Personel</DataTableHeaderCell>
                  <DataTableHeaderCell>Hizmet</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {overview.upcomingAppointments.slice(0, 8).map((item) => (
                  <DataTableRow key={item.id}>
                    <DataTableCell>
                      <Link
                        href={`/settings/appointments/${item.id}`}
                        className="underline"
                      >
                        {new Date(item.startAt).toLocaleString("tr-TR")}
                      </Link>
                    </DataTableCell>
                    <DataTableCell>
                      {item.customer.firstName} {item.customer.lastName}
                    </DataTableCell>
                    <DataTableCell>
                      {item.staff.firstName} {item.staff.lastName}
                    </DataTableCell>
                    <DataTableCell>{item.serviceNameSnapshot}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </section>
      </QueryState>
    </PageFrame>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </article>
  );
}
