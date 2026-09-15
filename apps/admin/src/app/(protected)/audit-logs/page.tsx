"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@xenior/ui";
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
import { useAdminAuditLogs } from "@/lib/admin/admin-queries";
import { formatDateTime } from "@/lib/admin/labels";

export default function AdminAuditLogsPage() {
  const [businessId, setBusinessId] = useState("");
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const logs = useAdminAuditLogs({
    businessId: businessId.trim() || undefined,
    userId: userId.trim() || undefined,
    action: action.trim() || undefined,
    entityType: entityType.trim() || undefined,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
    page,
    pageSize: 25,
  });

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Denetim kayıtları"
        description="İşletme, kullanıcı, eylem, varlık ve tarih ile süzülür."
      />
      <form
        className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="flex flex-col gap-1 text-sm">
          İşletme kimliği
          <input
            value={businessId}
            onChange={(event) => {
              setBusinessId(event.target.value);
              setPage(1);
            }}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Kullanıcı kimliği
          <input
            value={userId}
            onChange={(event) => {
              setUserId(event.target.value);
              setPage(1);
            }}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Eylem
          <input
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
            placeholder="BUSINESS_STATUS"
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Varlık
          <input
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value);
              setPage(1);
            }}
            placeholder="Business"
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Başlangıç
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Bitiş
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
      </form>
      <QueryState
        isLoading={logs.isLoading}
        isError={logs.isError}
        isEmpty={logs.data?.items.length === 0}
        loading="Kayıtlar yükleniyor…"
        error="Denetim kayıtları yüklenemedi."
        empty="Filtrelere uyan kayıt yok."
      >
        {logs.data ? (
          <>
            <p className="mt-4 text-sm text-zinc-600">
              {logs.data.total} kayıt · sayfa {logs.data.page}/
              {Math.max(logs.data.totalPages, 1)}
            </p>
            <DataTable caption="Denetim kayıtları">
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Tarih</DataTableHeaderCell>
                  <DataTableHeaderCell>İşletme</DataTableHeaderCell>
                  <DataTableHeaderCell>Kullanıcı</DataTableHeaderCell>
                  <DataTableHeaderCell>Eylem</DataTableHeaderCell>
                  <DataTableHeaderCell>Varlık</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {logs.data.items.map((log) => (
                  <DataTableRow key={log.id}>
                    <DataTableCell>{formatDateTime(log.createdAt)}</DataTableCell>
                    <DataTableCell>
                      <Link href={`/businesses/${log.businessId}`} className="underline">
                        {log.businessName}
                      </Link>
                    </DataTableCell>
                    <DataTableCell>{log.userEmail ?? "—"}</DataTableCell>
                    <DataTableCell>{log.action}</DataTableCell>
                    <DataTableCell>
                      {log.entityType}
                      <p className="text-xs text-zinc-500">{log.entityId}</p>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Önceki
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!logs.data.hasMore}
                onClick={() => setPage((current) => current + 1)}
              >
                Sonraki
              </Button>
            </div>
          </>
        ) : null}
      </QueryState>
    </PageFrame>
  );
}
