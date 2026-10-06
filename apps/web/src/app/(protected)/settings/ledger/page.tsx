"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { QueryState } from "@/components/ui/query-state";
import { formatTry } from "@/lib/money";
import { useLedgerCustomers, useLedgerEntries } from "@/lib/ledger/ledger-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

export default function LedgerPage() {
  const [search, setSearch] = useState("");
  const customers = useLedgerCustomers(search);
  const entries = useLedgerEntries();

  const customerItems = customers.data?.pages.flatMap((page) => page.items) ?? [];
  const entryItems = entries.data?.pages.flatMap((page) => page.items) ?? [];
  const hasMoreEntries = entries.hasNextPage;

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
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Müşteri ara…"
            className="mb-4 w-full max-w-xs rounded-md border border-[#c5dde6] px-3 py-2 text-sm outline-none focus:border-[#7eb8c8]"
          />
          <QueryState
            isLoading={customers.isLoading}
            isError={customers.isError}
            onRetry={() => customers.refetch()}
            isEmpty={customerItems.length === 0}
            loading="Cari yükleniyor…"
            error="Cari yüklenemedi."
            empty={search ? "Aramaya uyan müşteri yok." : "Henüz müşteri yok."}
          >
            <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
              {customerItems.map((person) => (
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
                        {formatTry(person.ledgerBalance)}
                      </p>
                      <ArrowRight className="h-4 w-4 text-[#7eb8c8]" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </QueryState>
          {customers.hasNextPage ? (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => customers.fetchNextPage()}
                disabled={customers.isFetchingNextPage}
                className="rounded-md border border-[#c5dde6] px-4 py-2 text-sm font-medium text-[#2f5563] transition hover:bg-[#eef6f8] disabled:opacity-50"
              >
                {customers.isFetchingNextPage
                  ? "Yükleniyor…"
                  : "Daha fazla göster"}
              </button>
            </div>
          ) : null}
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
            isEmpty={entryItems.length === 0}
            loading="Hareketler yükleniyor…"
            error="Hareketler yüklenemedi."
            empty="Henüz cari hareket yok."
          >
            <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
              {entryItems.map((entry) => (
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
                      {formatTry(entry.amount)}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#5a7380]">
                      Bakiye {formatTry(entry.balanceAfter)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </QueryState>
          {hasMoreEntries ? (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => entries.fetchNextPage()}
                disabled={entries.isFetchingNextPage}
                className="rounded-md border border-[#c5dde6] px-4 py-2 text-sm font-medium text-[#2f5563] transition hover:bg-[#eef6f8] disabled:opacity-50"
              >
                {entries.isFetchingNextPage
                  ? "Yükleniyor…"
                  : "Daha fazla göster"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </PageFrame>
  );
}
