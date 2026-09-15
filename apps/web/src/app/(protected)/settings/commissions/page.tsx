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
  useCanManageCommissions,
  useCommissionRuleList,
} from "@/lib/commissions/commission-queries";
import { useServiceList } from "@/lib/services/service-queries";

export default function CommissionRulesPage() {
  const [active, setActive] = useState<"all" | "true" | "false">("all");
  const canManage = useCanManageCommissions();
  const rules = useCommissionRuleList(
    active === "all" ? undefined : active === "true",
  );
  const services = useServiceList({});

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Prim kuralları"
        description="Tamamlanan randevuda hizmete göre yüzde veya tutar prim satırı oluşur."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/settings/commissions/new">Yeni kural</Link>
            </Button>
          ) : null
        }
      />
      <div className="mt-6">
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
        isLoading={rules.isLoading}
        isError={rules.isError}
        isEmpty={rules.data?.length === 0}
        loading="Prim kuralları yükleniyor…"
        error="Prim kuralları yüklenemedi."
        empty="Henüz prim kuralı yok."
      >
        {rules.data ? (
          <DataTable caption="Prim kuralı listesi">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Kural</DataTableHeaderCell>
                <DataTableHeaderCell>Hizmet</DataTableHeaderCell>
                <DataTableHeaderCell>Prim</DataTableHeaderCell>
                <DataTableHeaderCell>Durum</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {rules.data.map((rule) => (
                <DataTableRow key={rule.id}>
                  <DataTableCell>
                    <Link
                      href={`/settings/commissions/${rule.id}`}
                      className="font-medium underline"
                    >
                      {rule.name}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>
                    {rule.serviceId
                      ? (services.data ?? []).find(
                          (service) => service.id === rule.serviceId,
                        )?.name ?? "Hizmet"
                      : "Tüm hizmetler"}
                  </DataTableCell>
                  <DataTableCell>
                    {rule.commissionType === "PERCENT"
                      ? `%${rule.commissionValue}`
                      : `${rule.commissionValue} TRY`}
                  </DataTableCell>
                  <DataTableCell>
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">
                      {rule.isActive ? "Aktif" : "Pasif"}
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
