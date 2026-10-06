"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { QueryState } from "@/components/ui/query-state";
import { usePageTitle } from "@/lib/use-page-title";
import { useCanWriteCash, useSaleList } from "@/lib/ledger/ledger-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const STATUS_LABEL = { OPEN: "Açık", SETTLED: "Kapandı" } as const;

export default function SalesPage() {
  usePageTitle("Satışlar");
  const sales = useSaleList();
  const canWrite = useCanWriteCash();
  const saleItems = sales.data?.pages.flatMap((page) => page.items) ?? [];

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
            Satışlar
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
            Tamamlanan randevu ve tezgah hizmet satışları. Açık hesap = satış −
            tahsilat.
          </p>
        </div>
        {canWrite ? (
          <Link
            href="/settings/sales/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#3d7a8c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a]"
          >
            <ShoppingBag className="h-4 w-4" />
            Tezgah satışı
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="p-4 sm:p-5">
          <QueryState
            isLoading={sales.isLoading}
            isError={sales.isError}
            onRetry={() => sales.refetch()}
            isEmpty={saleItems.length === 0}
            loading="Satışlar yükleniyor…"
            error="Satışlar yüklenemedi."
            empty="Henüz satış yok. Randevu tamamlayın veya tezgah satışı oluşturun."
          >
            <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
              {saleItems.map((sale) => (
                <li key={sale.id}>
                  <Link
                    href={`/settings/sales/${sale.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-[#eef6f8]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[#1e3340]">
                        {sale.customer.firstName} {sale.customer.lastName}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-[#5a7380]">
                        {sale.lines[0]?.nameSnapshot ?? "Hizmet"} ·{" "}
                        {sale.totalAmount} {sale.currency}
                        {sale.remainingAmount !== "0.00"
                          ? ` · kalan ${sale.remainingAmount}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          sale.status === "OPEN"
                            ? "bg-[#fff8eb] text-[#8a6a2f]"
                            : "bg-[#b8e6df]/45 text-[#2f5563]"
                        }`}
                      >
                        {STATUS_LABEL[sale.status]}
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#7eb8c8]" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </QueryState>
          {sales.hasNextPage ? (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => sales.fetchNextPage()}
                disabled={sales.isFetchingNextPage}
                className="rounded-md border border-[#c5dde6] px-4 py-2 text-sm font-medium text-[#2f5563] transition hover:bg-[#eef6f8] disabled:opacity-50"
              >
                {sales.isFetchingNextPage ? "Yükleniyor…" : "Daha fazla göster"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </PageFrame>
  );
}
