"use client";

import { useMemo, useState } from "react";
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
import { useCanReadReports, useFinanceSummary } from "@/lib/reports/reports-queries";
import type { FinanceSummaryReport } from "@xenior/types";

const ACCOUNT_TYPE = { CASH: "Nakit", BANK: "Banka" };
const EXPENSE_LABEL: Record<string, string> = {
  RENT: "Kira",
  UTILITY: "Fatura",
  MATERIAL: "Malzeme",
  SALARY: "Maaş",
  COMMISSION: "Prim",
  OTHER: "Diğer",
};

export default function ReportsPage() {
  const canRead = useCanReadReports();
  const [date, setDate] = useState("");
  const summary = useFinanceSummary(date || undefined);

  if (!canRead) {
    return (
      <PageFrame>
        <p className="text-sm text-zinc-600">Bu raporlar muhasebe ve sahip içindir.</p>
      </PageFrame>
    );
  }

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Raporlar"
        description="Günlük kasa, cari alacak, prim ve gider özeti. Tam gelir tablosu değildir."
        actions={
          summary.data ? (
            <Button type="button" variant="outline" onClick={() => downloadCsv(summary.data)}>
              CSV indir
            </Button>
          ) : null
        }
      />
      <label className="mt-4 flex max-w-xs flex-col gap-1 text-sm">
        Tarih
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <p className="mt-1 text-xs text-zinc-500">Boş bırakınca işletme saat diliminde bugün kullanılır.</p>
      <QueryState
        isLoading={summary.isLoading}
        isError={summary.isError}
        loading="Rapor yükleniyor…"
        error="Rapor yüklenemedi."
      >
        {summary.data ? <ReportBody report={summary.data} /> : null}
      </QueryState>
    </PageFrame>
  );
}

function ReportBody({ report }: { report: FinanceSummaryReport }) {
  const expenseRows = useMemo(
    () =>
      report.expenses.byCategory.length > 0
        ? report.expenses.byCategory
        : [{ category: "—", amount: "0.00" }],
    [report.expenses.byCategory],
  );

  return (
    <div className="mt-6 space-y-8">
      <section aria-label="Günlük kasa">
        <h2 className="text-lg font-semibold">Günlük kasa</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {report.date} · {report.timezone}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Tahsilat"
            value={`${report.cash.collectionsIn} ${report.currency}`}
          />
          <StatCard
            label="Gider"
            value={`${report.cash.expensesOut} ${report.currency}`}
          />
          <StatCard label="Net" value={`${report.cash.net} ${report.currency}`} />
        </div>
        <DataTable caption="Kasa bakiyeleri" className="mt-4">
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Hesap</DataTableHeaderCell>
              <DataTableHeaderCell>Tür</DataTableHeaderCell>
              <DataTableHeaderCell>Bakiye</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {report.cash.accounts.map((account) => (
              <DataTableRow key={account.id}>
                <DataTableCell>{account.name}</DataTableCell>
                <DataTableCell>{ACCOUNT_TYPE[account.type]}</DataTableCell>
                <DataTableCell>
                  {account.balance} {report.currency}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </section>

      <section aria-label="Cari alacak">
        <h2 className="text-lg font-semibold">Cari alacak</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <StatCard
            label="Toplam alacak"
            value={`${report.receivables.totalOutstanding} ${report.currency}`}
          />
          <StatCard
            label="Alacaklı müşteri"
            value={String(report.receivables.customerCount)}
          />
        </div>
      </section>

      <section aria-label="Prim toplamı">
        <h2 className="text-lg font-semibold">Prim toplamı</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <StatCard
            label="Günlük prim"
            value={`${report.commissions.totalAmount} ${report.currency}`}
          />
          <StatCard
            label="Satır"
            value={String(report.commissions.entryCount)}
          />
        </div>
      </section>

      <section aria-label="Gider">
        <h2 className="text-lg font-semibold">Gider</h2>
        <DataTable caption="Gider kategorileri" className="mt-4">
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Kategori</DataTableHeaderCell>
              <DataTableHeaderCell>Tutar</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {expenseRows.map((row) => (
              <DataTableRow key={row.category}>
                <DataTableCell>
                  {EXPENSE_LABEL[row.category] ?? row.category}
                </DataTableCell>
                <DataTableCell>
                  {row.amount} {report.currency}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </article>
  );
}

function downloadCsv(report: FinanceSummaryReport): void {
  const lines = [
    ["Tarih", report.date],
    ["Saat dilimi", report.timezone],
    ["Para birimi", report.currency],
    ["Günlük tahsilat", report.cash.collectionsIn],
    ["Günlük gider", report.cash.expensesOut],
    ["Net kasa hareketi", report.cash.net],
    ...report.cash.accounts.map((account) => [
      `Kasa bakiyesi (${account.name})`,
      account.balance,
    ]),
    ["Cari alacak", report.receivables.totalOutstanding],
    ["Alacaklı müşteri", String(report.receivables.customerCount)],
    ["Prim toplamı", report.commissions.totalAmount],
    ["Prim satırı", String(report.commissions.entryCount)],
    ...report.expenses.byCategory.map((row) => [
      `Gider (${EXPENSE_LABEL[row.category] ?? row.category})`,
      row.amount,
    ]),
  ];
  const csv = `\uFEFF${lines
    .map((row) => row.map(csvCell).join(";"))
    .join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `planio-kasa-${report.date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string): string {
  if (/[;"\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
