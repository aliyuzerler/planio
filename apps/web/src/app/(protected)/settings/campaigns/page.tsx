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
  useCampaignList,
  useCanManageCampaigns,
} from "@/lib/campaigns/campaign-queries";

export default function CampaignsPage() {
  const [active, setActive] = useState<"all" | "true" | "false">("all");
  const canManage = useCanManageCampaigns();
  const campaigns = useCampaignList(
    active === "all" ? undefined : active === "true",
  );

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Kampanyalar"
        description="Tarih aralıklı yüzde veya tutar indirimi. Randevu aynı fiyatı snapshot olarak kaydeder."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/settings/campaigns/new">Yeni kampanya</Link>
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
        isLoading={campaigns.isLoading}
        isError={campaigns.isError}
        isEmpty={campaigns.data?.length === 0}
        loading="Kampanyalar yükleniyor…"
        error="Kampanyalar yüklenemedi."
        empty="Henüz kampanya yok."
      >
        {campaigns.data ? (
          <DataTable caption="Kampanya listesi">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Kampanya</DataTableHeaderCell>
                <DataTableHeaderCell>İndirim</DataTableHeaderCell>
                <DataTableHeaderCell>Tarih</DataTableHeaderCell>
                <DataTableHeaderCell>Durum</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {campaigns.data.map((campaign) => (
                <DataTableRow key={campaign.id}>
                  <DataTableCell>
                    <Link
                      href={`/settings/campaigns/${campaign.id}`}
                      className="font-medium underline"
                    >
                      {campaign.name}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>
                    {campaign.discountType === "PERCENT"
                      ? `%${campaign.discountValue}`
                      : `${campaign.discountValue} TRY`}
                  </DataTableCell>
                  <DataTableCell>
                    {new Date(campaign.startsAt).toLocaleDateString("tr-TR")} –{" "}
                    {new Date(campaign.endsAt).toLocaleDateString("tr-TR")}
                  </DataTableCell>
                  <DataTableCell>
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">
                      {campaign.isActive ? "Aktif" : "Pasif"}
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
