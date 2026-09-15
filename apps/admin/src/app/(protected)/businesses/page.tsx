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
import { useAdminBusinesses } from "@/lib/admin/admin-queries";
import {
  BILLING_PERIOD_LABELS,
  BUSINESS_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from "@/lib/admin/labels";
import type { BusinessStatus } from "@xenior/types";

export default function AdminBusinessesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | BusinessStatus>("all");
  const [page, setPage] = useState(1);
  const businesses = useAdminBusinesses({
    q: q.trim() || undefined,
    status: status === "all" ? undefined : status,
    page,
    pageSize: 25,
  });

  return (
    <PageFrame width="lg">
      <PageHeader
        title="İşletmeler"
        description="Tüm kiracıları, durumlarını ve güncel aboneliklerini görüntüleyin."
      />
      <div className="mt-6 flex flex-wrap gap-3">
        <input
          aria-label="İşletme ara"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
          placeholder="İşletme adı veya e-posta"
          className="min-w-64 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <select
          aria-label="İşletme durumu"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status);
            setPage(1);
          }}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="all">Tüm durumlar</option>
          <option value="ACTIVE">Aktif</option>
          <option value="SUSPENDED">Askıya alındı</option>
          <option value="CLOSED">Kapatıldı</option>
        </select>
      </div>
      <QueryState
        isLoading={businesses.isLoading}
        isError={businesses.isError}
        isEmpty={businesses.data?.items.length === 0}
        loading="İşletmeler yükleniyor…"
        error="İşletmeler yüklenemedi."
        empty="Aramayla eşleşen işletme yok."
      >
        {businesses.data ? (
          <>
            <p className="mt-4 text-sm text-zinc-600">
              {businesses.data.total} işletme · sayfa {businesses.data.page}/
              {Math.max(businesses.data.totalPages, 1)}
            </p>
            <DataTable caption="İşletme listesi">
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>İşletme</DataTableHeaderCell>
                  <DataTableHeaderCell>Durum</DataTableHeaderCell>
                  <DataTableHeaderCell>Abonelik</DataTableHeaderCell>
                  <DataTableHeaderCell>Plan</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {businesses.data.items.map((business) => (
                  <DataTableRow key={business.id}>
                    <DataTableCell>
                      <Link
                        href={`/businesses/${business.id}`}
                        className="font-medium underline"
                      >
                        {business.name}
                      </Link>
                      <p className="text-xs text-zinc-500">
                        {business.email ?? "E-posta yok"}
                      </p>
                    </DataTableCell>
                    <DataTableCell>
                      {BUSINESS_STATUS_LABELS[business.status]}
                      {business.status === "SUSPENDED" ||
                      business.status === "CLOSED" ? (
                        <p className="text-xs font-medium text-amber-800">
                          Askı / kapalı
                        </p>
                      ) : null}
                    </DataTableCell>
                    <DataTableCell>
                      {business.subscription ? (
                        <span
                          className={
                            business.subscription.status === "EXPIRED"
                              ? "font-medium text-red-700"
                              : undefined
                          }
                        >
                          {SUBSCRIPTION_STATUS_LABELS[business.subscription.status]}
                        </span>
                      ) : (
                        <span className="font-medium text-red-700">
                          Abonelik yok
                        </span>
                      )}
                      {business.subscription?.status === "EXPIRED" ? (
                        <p className="text-xs text-red-700">Süresi doldu</p>
                      ) : null}
                    </DataTableCell>
                    <DataTableCell>
                      {business.subscription
                        ? `${business.subscription.plan.name} · ${BILLING_PERIOD_LABELS[business.subscription.billingPeriod]}`
                        : "—"}
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
                disabled={!businesses.data.hasMore}
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
