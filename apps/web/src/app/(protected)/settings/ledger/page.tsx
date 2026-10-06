"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { QueryState } from "@/components/ui/query-state";
import { useLedgerCustomers, useLedgerEntries } from "@/lib/ledger/ledger-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

export default function LedgerPage() {
  const customers = useLedgerCustomers();
  const entries = useLedgerEntries();

  return (
    <PageFrame width="lg" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <div>
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          Finans
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          Cari
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          Satış bakiyeyi artırır, tahsilat düşürür. Açık hesap kalan borçtur.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
            Bakiyeler
          </h2>
        </div>
        <div className="p-4 sm:p-5">
          <QueryState
            isLoading={customers.isLoading}
            isError={customers.isError}
            onRetry={() => customers.refetch()}
            isEmpty={customers.data?.length === 0}
            loading="Cari yükleniyor…"
            error="Cari yüklenemedi."
            empty="Henüz müşteri yok."
          >
            {customers.data ? (
              <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
                {customers.data.map((person) => (
                  <li key={person.id}>
                    <Link
                      href={`/settings/customers/${person.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-[#eef6f8]"
                    >
                      <p className="truncate text-[15px] font-semibold text-[#1e3340]">
                        {person.firstName} {person.lastName}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-semibold text-[#2f5563]">
                          {person.ledgerBalance} TRY
                        </p>
                        <ArrowRight className="h-4 w-4 text-[#7eb8c8]" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </QueryState>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
            Son hareketler
          </h2>
        </div>
        <div className="p-4 sm:p-5">
          <QueryState
            isLoading={entries.isLoading}
            isError={entries.isError}
            onRetry={() => entries.refetch()}
            isEmpty={entries.data?.items.length === 0}
            loading="Hareketler yükleniyor…"
            error="Hareketler yüklenemedi."
            empty="Henüz cari hareket yok."
          >
            {entries.data ? (
              <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
                {entries.data.items.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[#1e3340]">
                        {entry.customer.firstName} {entry.customer.lastName}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-[#5a7380]">
                        {entry.saleId ? (
                          <Link
                            href={`/settings/sales/${entry.saleId}`}
                            className="font-medium text-[#3d6b7a] hover:text-[#2f5563]"
                          >
                            {entry.description}
                          </Link>
                        ) : (
                          entry.description
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] font-semibold text-[#2f5563]">
                        {entry.amount} TRY
                      </p>
                      <p className="mt-0.5 text-[12px] text-[#5a7380]">
                        Bakiye {entry.balanceAfter} TRY
                      </p>
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
