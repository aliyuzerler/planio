"use client";

import Link from "next/link";
import { ArrowRight, Receipt } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { QueryState } from "@/components/ui/query-state";
import { useCanWriteCash, useExpenseList } from "@/lib/ledger/ledger-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const CATEGORY_LABEL = {
  RENT: "Kira",
  UTILITY: "Fatura",
  MATERIAL: "Malzeme",
  SALARY: "Maaş",
  COMMISSION: "Prim",
  OTHER: "Diğer",
} as const;

export default function ExpensesPage() {
  const expenses = useExpenseList();
  const canWrite = useCanWriteCash();

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
            Giderler
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
            Kasa çıkışı. Prim ödemesi hakediş satırına bağlanabilir.
          </p>
        </div>
        {canWrite ? (
          <Link
            href="/settings/expenses/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#7eb8c8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6aa9bb]"
          >
            <Receipt className="h-4 w-4" />
            Yeni gider
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="p-4 sm:p-5">
          <QueryState
            isLoading={expenses.isLoading}
            isError={expenses.isError}
            isEmpty={expenses.data?.items.length === 0}
            loading="Giderler yükleniyor…"
            error="Giderler yüklenemedi."
            empty="Henüz gider yok."
          >
            {expenses.data ? (
              <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
                {expenses.data.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[#1e3340]">
                        {CATEGORY_LABEL[item.category]}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-[#5a7380]">
                        {item.cashAccountName} ·{" "}
                        {new Date(item.occurredAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <p className="text-[15px] font-semibold text-[#2f5563]">
                      {item.amount} {item.currency}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </QueryState>
        </div>
      </div>
    </PageFrame>
  );
}
