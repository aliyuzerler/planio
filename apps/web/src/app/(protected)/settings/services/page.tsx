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
  useCanManageServices,
  useServiceList,
} from "@/lib/services/service-queries";

export default function ServicesPage() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<"all" | "true" | "false">("all");
  const canManage = useCanManageServices();
  const services = useServiceList({
    q: q.trim() || undefined,
    isActive: active === "all" ? undefined : active === "true",
  });

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Hizmetler"
        description="İşletmenize özel hizmetleri ve fiyatlarını yönetin."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/settings/services/new">Yeni hizmet</Link>
            </Button>
          ) : null
        }
      />
      <div className="mt-6 flex gap-3">
        <input
          aria-label="Hizmet ara"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Hizmet ara"
          className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2"
        />
        <select
          aria-label="Durum filtresi"
          value={active}
          onChange={(event) => setActive(event.target.value as typeof active)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        >
          <option value="all">Tümü</option>
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>
      </div>
      <QueryState
        isLoading={services.isLoading}
        isError={services.isError}
        isEmpty={services.data?.length === 0}
        loading="Hizmetler yükleniyor…"
        error="Hizmetler yüklenemedi."
        empty="Henüz hizmet eklenmemiş."
      >
        {services.data ? (
          <DataTable caption="Hizmet listesi">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Hizmet</DataTableHeaderCell>
                <DataTableHeaderCell>Süre</DataTableHeaderCell>
                <DataTableHeaderCell>Fiyat</DataTableHeaderCell>
                <DataTableHeaderCell>Durum</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {services.data.map((service) => (
                <DataTableRow key={service.id}>
                  <DataTableCell>
                    <Link
                      href={`/settings/services/${service.id}`}
                      className="font-medium underline"
                    >
                      {service.name}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>{service.durationMinutes} dk</DataTableCell>
                  <DataTableCell>
                    {service.price} {service.currency}
                  </DataTableCell>
                  <DataTableCell>
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">
                      {service.isActive ? "Aktif" : "Pasif"}
                    </span>
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
