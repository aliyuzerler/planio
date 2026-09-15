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
import { useCanWriteCash, useCashAccountList } from "@/lib/ledger/ledger-queries";

const TYPE_LABEL = { CASH: "Nakit", BANK: "Banka" };

export default function CashAccountsPage() {
  const accounts = useCashAccountList();
  const canWrite = useCanWriteCash();

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Kasa"
        description="Nakit ve banka hesap bakiyeleri. Tahsilat giriş, gider çıkış yazar."
        actions={
          canWrite ? (
            <Button asChild>
              <Link href="/settings/cash/new">Yeni hesap</Link>
            </Button>
          ) : null
        }
      />
      <QueryState
        isLoading={accounts.isLoading}
        isError={accounts.isError}
        isEmpty={accounts.data?.length === 0}
        loading="Kasa hesapları yükleniyor…"
        error="Kasa hesapları yüklenemedi."
        empty="Henüz kasa hesabı yok."
      >
        {accounts.data ? (
          <DataTable caption="Kasa hesapları">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Hesap</DataTableHeaderCell>
                <DataTableHeaderCell>Tür</DataTableHeaderCell>
                <DataTableHeaderCell>Bakiye</DataTableHeaderCell>
                <DataTableHeaderCell>Durum</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {accounts.data.map((account) => (
                <DataTableRow key={account.id}>
                  <DataTableCell>
                    {account.name}
                    {account.isDefault ? " · varsayılan" : ""}
                  </DataTableCell>
                  <DataTableCell>{TYPE_LABEL[account.type]}</DataTableCell>
                  <DataTableCell>
                    {account.balance} {account.currency}
                  </DataTableCell>
                  <DataTableCell>{account.isActive ? "Aktif" : "Pasif"}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}
      </QueryState>
    </PageFrame>
  );
}
