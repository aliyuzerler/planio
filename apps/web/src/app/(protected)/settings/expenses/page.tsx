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
import { useCanWriteCash, useExpenseList } from "@/lib/ledger/ledger-queries";

const CATEGORY_LABEL = {
  RENT: "Kira",
  UTILITY: "Fatura",
  MATERIAL: "Malzeme",
  SALARY: "Maaş",
  COMMISSION: "Prim",
  OTHER: "Diğer",
};

export default function ExpensesPage() {
  const expenses = useExpenseList();
  const canWrite = useCanWriteCash();

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Giderler"
        description="Kasa çıkışı. Prim ödemesi hakediş satırına bağlanabilir."
        actions={
          canWrite ? (
            <Button asChild>
              <Link href="/settings/expenses/new">Yeni gider</Link>
            </Button>
          ) : null
        }
      />
      <QueryState
        isLoading={expenses.isLoading}
        isError={expenses.isError}
        isEmpty={expenses.data?.items.length === 0}
        loading="Giderler yükleniyor…"
        error="Giderler yüklenemedi."
        empty="Henüz gider yok."
      >
        {expenses.data ? (
          <DataTable caption="Gider listesi">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Kategori</DataTableHeaderCell>
                <DataTableHeaderCell>Kasa</DataTableHeaderCell>
                <DataTableHeaderCell>Tutar</DataTableHeaderCell>
                <DataTableHeaderCell>Tarih</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {expenses.data.items.map((item) => (
                <DataTableRow key={item.id}>
                  <DataTableCell>{CATEGORY_LABEL[item.category]}</DataTableCell>
                  <DataTableCell>{item.cashAccountName}</DataTableCell>
                  <DataTableCell>
                    {item.amount} {item.currency}
                  </DataTableCell>
                  <DataTableCell>
                    {new Date(item.occurredAt).toLocaleString("tr-TR")}
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
