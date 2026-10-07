"use client";

import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { QueryState } from "@/components/ui/query-state";
import { useCanWriteCash, useCashAccountList } from "@/lib/ledger/ledger-queries";
import { formatMoney } from "@/lib/money";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const TYPE_LABEL = { CASH: "Nakit", BANK: "Banka" } as const;

export default function CashAccountsPage() {
  const accounts = useCashAccountList();
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
            Kasa
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
            Nakit ve banka hesap bakiyeleri. Tahsilat giriş, gider çıkış yazar.
          </p>
        </div>
        {canWrite ? (
          <Link
            href="/settings/cash/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#3d7a8c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a]"
          >
            <Wallet className="h-4 w-4" />
            Yeni hesap
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="p-4 sm:p-5">
          <QueryState
            isLoading={accounts.isLoading}
            isError={accounts.isError}
            onRetry={() => accounts.refetch()}
            isEmpty={accounts.data?.length === 0}
            loading="Kasa hesapları yükleniyor…"
            error="Kasa hesapları yüklenemedi."
            empty="Henüz kasa hesabı yok."
          >
            {accounts.data ? (
              <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
                {accounts.data.map((account) => (
                  <li
                    key={account.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[#1e3340]">
                        {account.name}
                        {account.isDefault ? (
                          <span className="ml-2 text-[12px] font-medium text-[#7eb8c8]">
                            varsayılan
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-[13px] text-[#5a7380]">
                        {TYPE_LABEL[account.type]}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-[#2f5563]">
                        {formatMoney(account.balance, account.currency)}
                      </p>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          account.isActive
                            ? "bg-[#b8e6df]/45 text-[#2f5563]"
                            : "bg-[#e4f0f4] text-[#5a7380]"
                        }`}
                      >
                        {account.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </div>
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
