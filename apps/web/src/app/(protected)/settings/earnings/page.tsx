"use client";

import Link from "next/link";
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
import { useCommissionEntries } from "@/lib/commissions/commission-queries";
import { useAuthStore } from "@/stores/auth-store";

export default function EarningsPage() {
  const entries = useCommissionEntries();
  const role = useAuthStore((state) =>
    state.memberships.find((item) => item.businessId === state.selectedBusinessId)
      ?.role,
  );
  const canOpenAppointment = role !== "ACCOUNTANT";

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Hakediş"
        description="Tamamlanan randevulardan oluşan prim satırları. Ödeme gider olarak kasadan çıkar."
      />
      <QueryState
        isLoading={entries.isLoading}
        isError={entries.isError}
        isEmpty={entries.data?.items.length === 0}
        loading="Hakediş yükleniyor…"
        error="Hakediş yüklenemedi."
        empty="Henüz prim satırı yok. Tamamlanan randevu ve aktif kural gerekir."
      >
        {entries.data ? (
          <DataTable caption="Hakediş listesi">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Personel</DataTableHeaderCell>
                <DataTableHeaderCell>Hizmet</DataTableHeaderCell>
                <DataTableHeaderCell>Kural</DataTableHeaderCell>
                <DataTableHeaderCell>Tutar</DataTableHeaderCell>
                <DataTableHeaderCell>Tarih</DataTableHeaderCell>
                <DataTableHeaderCell>Ödeme</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {entries.data.items.map((entry) => (
                <DataTableRow key={entry.id}>
                  <DataTableCell>{entry.staffNameSnapshot}</DataTableCell>
                  <DataTableCell>
                    {canOpenAppointment && entry.appointmentId ? (
                      <Link
                        href={`/settings/appointments/${entry.appointmentId}`}
                        className="underline"
                      >
                        {entry.serviceNameSnapshot}
                      </Link>
                    ) : (
                      entry.serviceNameSnapshot
                    )}
                  </DataTableCell>
                  <DataTableCell>{entry.ruleNameSnapshot}</DataTableCell>
                  <DataTableCell>
                    {entry.amount} {entry.currency}
                  </DataTableCell>
                  <DataTableCell>
                    {new Date(entry.earnedAt).toLocaleString("tr-TR")}
                  </DataTableCell>
                  <DataTableCell>
                    {role === "BUSINESS_OWNER" || role === "ACCOUNTANT" ? (
                      <Link
                        href={`/settings/expenses/new?category=COMMISSION&amount=${entry.amount}&commissionEntryId=${entry.id}`}
                        className="underline"
                      >
                        Öde
                      </Link>
                    ) : (
                      "—"
                    )}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}
      </QueryState>
    </PageFrame>
  );
}
