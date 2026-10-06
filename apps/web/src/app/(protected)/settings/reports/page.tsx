"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { QueryState } from "@/components/ui/query-state";
import { usePageTitle } from "@/lib/use-page-title";
import { useCanReadReports, useFinanceSummary } from "@/lib/reports/reports-queries";
import type { FinanceSummaryReport } from "@xenior/types";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-white px-3 py-2.5 text-[15px] text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

const ACCOUNT_TYPE = { CASH: "Nakit", BANK: "Banka" } as const;
const EXPENSE_LABEL: Record<string, string> = {
  RENT: "Kira",
  UTILITY: "Fatura",
  MATERIAL: "Malzeme",
  SALARY: "Maaş",
  COMMISSION: "Prim",
  OTHER: "Diğer",
};

export default function ReportsPage() {
  usePageTitle("Raporlar");
  const canRead = useCanReadReports();
  const [date, setDate] = useState("");
  const summary = useFinanceSummary(date || undefined);

  if (!canRead) {
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">
          Bu raporlar muhasebe ve sahip içindir.
        </p>
      </PageFrame>
    );
  }

  return (
    <PageFrame width="lg" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Finans
          </p>
          <h1
            className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
            style={displayFont}
          >
            Raporlar
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
            Günlük kasa, cari alacak, prim ve gider özeti. Tam gelir tablosu
            değildir.
          </p>
        </div>
        {summary.data ? (
          <button
            type="button"
            onClick={() => downloadCsv(summary.data)}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5563] ring-1 ring-[#c5dde6] transition hover:bg-[#eef6f8]"
          >
            <Download className="h-4 w-4" />
            CSV indir
          </button>
        ) : null}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-4 py-3 sm:px-5">
          <label className="flex max-w-xs flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
            Tarih
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={fieldClass}
            />
          </label>
          <p className="mt-2 text-[12px] text-[#5a7380]">
            Boş bırakınca işletme saat diliminde bugün kullanılır.
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <QueryState
            isLoading={summary.isLoading}
            isError={summary.isError}
            onRetry={() => summary.refetch()}
            loading="Rapor yükleniyor…"
            error="Rapor yüklenemedi."
          >
            {summary.data ? <ReportBody report={summary.data} /> : null}
          </QueryState>
        </div>
      </div>
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
    <div className="space-y-8">
      <section aria-label="Günlük kasa">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
            Günlük kasa
          </h2>
          <p className="mt-1 text-[13px] text-[#5a7380]">
            {report.date} · {report.timezone}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatBlock
            label="Tahsilat"
            value={`${report.cash.collectionsIn} ${report.currency}`}
          />
          <StatBlock
            label="Gider"
            value={`${report.cash.expensesOut} ${report.currency}`}
          />
          <StatBlock
            label="Net"
            value={`${report.cash.net} ${report.currency}`}
          />
        </div>
        {report.cash.accounts.length > 0 ? (
          <ul className="mt-4 divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
            {report.cash.accounts.map((account) => (
              <li
                key={account.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-[#1e3340]">
                    {account.name}
                  </p>
                  <p className="mt-0.5 text-[13px] text-[#5a7380]">
                    {ACCOUNT_TYPE[account.type]}
                  </p>
                </div>
                <p className="text-[15px] font-semibold tabular-nums text-[#2f5563]">
                  {account.balance} {report.currency}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-label="Cari alacak">
        <h2
          className="mb-4 text-lg font-semibold text-[#2f5563]"
          style={displayFont}
        >
          Cari alacak
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatBlock
            label="Toplam alacak"
            value={`${report.receivables.totalOutstanding} ${report.currency}`}
          />
          <StatBlock
            label="Alacaklı müşteri"
            value={String(report.receivables.customerCount)}
          />
        </div>
      </section>

      <section aria-label="Prim toplamı">
        <h2
          className="mb-4 text-lg font-semibold text-[#2f5563]"
          style={displayFont}
        >
          Prim toplamı
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatBlock
            label="Günlük prim"
            value={`${report.commissions.totalAmount} ${report.currency}`}
          />
          <StatBlock
            label="Satır"
            value={String(report.commissions.entryCount)}
          />
        </div>
      </section>

      <section aria-label="Gider">
        <h2
          className="mb-4 text-lg font-semibold text-[#2f5563]"
          style={displayFont}
        >
          Gider
        </h2>
        <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
          {expenseRows.map((row) => (
            <li
              key={row.category}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
            >
              <p className="text-[15px] font-semibold text-[#1e3340]">
                {EXPENSE_LABEL[row.category] ?? row.category}
              </p>
              <p className="text-[15px] font-semibold tabular-nums text-[#2f5563]">
                {row.amount} {report.currency}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F7FBFC] px-4 py-4 ring-1 ring-[#e4f0f4]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
        {label}
      </p>
      <p
        className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-[#2f5563]"
        style={displayFont}
      >
        {value}
      </p>
    </div>
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
