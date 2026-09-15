"use client";

import Link from "next/link";
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
import { useLedgerCustomers, useLedgerEntries } from "@/lib/ledger/ledger-queries";

export default function LedgerPage() {
  const customers = useLedgerCustomers();
  const entries = useLedgerEntries();

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Cari"
        description="Satış bakiyeyi artırır, tahsilat düşürür. Açık hesap kalan borçtur."
      />
      <QueryState
        isLoading={customers.isLoading}
        isError={customers.isError}
        isEmpty={customers.data?.length === 0}
        loading="Cari yükleniyor…"
        error="Cari yüklenemedi."
        empty="Henüz müşteri yok."
      >
        {customers.data ? (
          <DataTable caption="Cari bakiyeler">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Müşteri</DataTableHeaderCell>
                <DataTableHeaderCell>Bakiye</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {customers.data.map((person) => (
                <DataTableRow key={person.id}>
                  <DataTableCell>
                    <Link
                      href={`/settings/customers/${person.id}`}
                      className="underline"
                    >
                      {person.firstName} {person.lastName}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>{person.ledgerBalance} TRY</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}
      </QueryState>

      <h2 className="mt-8 text-lg font-semibold">Son hareketler</h2>
      <QueryState
        isLoading={entries.isLoading}
        isError={entries.isError}
        isEmpty={entries.data?.items.length === 0}
        loading="Hareketler yükleniyor…"
        error="Hareketler yüklenemedi."
        empty="Henüz cari hareket yok."
      >
        {entries.data ? (
          <DataTable caption="Cari hareketler">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Müşteri</DataTableHeaderCell>
                <DataTableHeaderCell>Açıklama</DataTableHeaderCell>
                <DataTableHeaderCell>Tutar</DataTableHeaderCell>
                <DataTableHeaderCell>Bakiye</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {entries.data.items.map((entry) => (
                <DataTableRow key={entry.id}>
                  <DataTableCell>
                    {entry.customer.firstName} {entry.customer.lastName}
                  </DataTableCell>
                  <DataTableCell>
                    {entry.saleId ? (
                      <Link href={`/settings/sales/${entry.saleId}`} className="underline">
                        {entry.description}
                      </Link>
                    ) : (
                      entry.description
                    )}
                  </DataTableCell>
                  <DataTableCell>{entry.amount} TRY</DataTableCell>
                  <DataTableCell>{entry.balanceAfter} TRY</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}
      </QueryState>
    </PageFrame>
  );
}
