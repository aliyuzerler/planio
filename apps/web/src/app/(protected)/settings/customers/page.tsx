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
import {
  useCanManageCustomers,
  useCustomerList,
} from "@/lib/customers/customer-queries";

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const canManage = useCanManageCustomers();
  const customers = useCustomerList({
    q: q.trim() || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "true",
    page,
    pageSize: 25,
  });

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Müşteriler"
        description="Müşterileri sunucu tarafında arayın; tüm kayıtlar tarayıcıya yüklenmez."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/settings/customers/new">Yeni müşteri</Link>
            </Button>
          ) : null
        }
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          aria-label="Müşteri ara"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
          placeholder="Ad, telefon veya e-posta ara"
          className="min-w-64 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <select
          aria-label="Durum filtresi"
          value={activeFilter}
          onChange={(event) => {
            setActiveFilter(event.target.value as typeof activeFilter);
            setPage(1);
          }}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="all">Tümü</option>
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>
      </div>

      <QueryState
        isLoading={customers.isLoading}
        isError={customers.isError}
        isEmpty={customers.data?.items.length === 0}
        loading="Müşteriler yükleniyor…"
        error="Müşteri bilgileri yüklenemedi."
        empty="Aramayla eşleşen müşteri yok."
      >
        {customers.data ? (
          <>
            <p className="mt-4 text-sm text-zinc-600">
              {customers.data.total} müşteri · sayfa {customers.data.page}/
              {Math.max(customers.data.totalPages, 1)}
            </p>
            <DataTable caption="Müşteri listesi">
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Ad</DataTableHeaderCell>
                  <DataTableHeaderCell>İletişim</DataTableHeaderCell>
                  <DataTableHeaderCell>Durum</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {customers.data.items.map((customer) => (
                  <DataTableRow key={customer.id}>
                    <DataTableCell>
                      <Link
                        href={`/settings/customers/${customer.id}`}
                        className="font-medium underline"
                      >
                        {customer.firstName} {customer.lastName}
                      </Link>
                    </DataTableCell>
                    <DataTableCell className="text-zinc-600">
                      {customer.phone ?? customer.email ?? "İletişim bilgisi yok"}
                    </DataTableCell>
                    <DataTableCell>
                      <Status active={customer.isActive} />
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
            <div className="mt-6 flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1 || customers.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Önceki
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!customers.data.hasMore || customers.isFetching}
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

function Status({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs ${
        active ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-700"
      }`}
    >
      {active ? "Aktif" : "Pasif"}
    </span>
  );
}
