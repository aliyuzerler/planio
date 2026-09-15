"use client";

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
import {
  auditActionLabel,
  formatAuditEntity,
} from "@/lib/reports/audit-labels";
import { useTenantAuditLogs } from "@/lib/reports/reports-queries";
import { useAuthStore } from "@/stores/auth-store";

export default function AuditLogsPage() {
  const role = useAuthStore((state) =>
    state.memberships.find((item) => item.businessId === state.selectedBusinessId)
      ?.role,
  );
  const logs = useTenantAuditLogs();

  if (role !== "BUSINESS_OWNER") {
    return (
      <PageFrame>
        <p className="text-sm text-zinc-600">Denetim kaydı yalnızca işletme sahibine açıktır.</p>
      </PageFrame>
    );
  }

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Denetim kaydı"
        description="İşletme içi işlem izi. Platform yöneticisi tenant finansını görmez."
      />
      <QueryState
        isLoading={logs.isLoading}
        isError={logs.isError}
        isEmpty={logs.data?.items.length === 0}
        loading="Denetim kaydı yükleniyor…"
        error="Denetim kaydı yüklenemedi."
        empty="Henüz denetim kaydı yok."
      >
        {logs.data ? (
          <DataTable caption="Denetim kayıtları">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Zaman</DataTableHeaderCell>
                <DataTableHeaderCell>İşlem</DataTableHeaderCell>
                <DataTableHeaderCell>Kayıt</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {logs.data.items.map((item) => (
                <DataTableRow key={item.id}>
                  <DataTableCell>
                    {new Date(item.createdAt).toLocaleString("tr-TR")}
                  </DataTableCell>
                  <DataTableCell>{auditActionLabel(item.action)}</DataTableCell>
                  <DataTableCell>
                    {formatAuditEntity(item.entityType, item.entityId)}
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
