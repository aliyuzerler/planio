"use client";

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
import { useCanWriteCash, useSaleList } from "@/lib/ledger/ledger-queries";

const STATUS_LABEL = { OPEN: "Açık", SETTLED: "Kapandı" };

export default function SalesPage() {
  const sales = useSaleList();
  const canWrite = useCanWriteCash();

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Satışlar"
        description="Tamamlanan randevu ve tezgah hizmet satışları. Açık hesap = satış − tahsilat."
        actions={
          canWrite ? (
            <Button asChild>
              <Link href="/settings/sales/new">Tezgah satışı</Link>
            </Button>
          ) : null
        }
      />
      <QueryState
        isLoading={sales.isLoading}
        isError={sales.isError}
        isEmpty={sales.data?.items.length === 0}
        loading="Satışlar yükleniyor…"
        error="Satışlar yüklenemedi."
        empty="Henüz satış yok. Randevu tamamlayın veya tezgah satışı oluşturun."
      >
        {sales.data ? (
          <DataTable caption="Satış listesi">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Müşteri</DataTableHeaderCell>
                <DataTableHeaderCell>Hizmet</DataTableHeaderCell>
                <DataTableHeaderCell>Tutar</DataTableHeaderCell>
                <DataTableHeaderCell>Kalan</DataTableHeaderCell>
                <DataTableHeaderCell>Durum</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {sales.data.items.map((sale) => (
                <DataTableRow key={sale.id}>
                  <DataTableCell>
                    <Link href={`/settings/sales/${sale.id}`} className="underline">
                      {sale.customer.firstName} {sale.customer.lastName}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>
                    {sale.lines[0]?.nameSnapshot ?? "Hizmet"}
                  </DataTableCell>
                  <DataTableCell>
                    {sale.totalAmount} {sale.currency}
                  </DataTableCell>
                  <DataTableCell>
                    {sale.remainingAmount} {sale.currency}
                  </DataTableCell>
                  <DataTableCell>{STATUS_LABEL[sale.status]}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}
      </QueryState>
    </PageFrame>
  );
}
