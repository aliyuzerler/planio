"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, UserPlus } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { QueryState } from "@/components/ui/query-state";
import { usePageTitle } from "@/lib/use-page-title";
import {
  useCanManageCustomers,
  useCustomerList,
} from "@/lib/customers/customer-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

const controlClass =
  "rounded-xl bg-white px-3 py-2.5 text-sm text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

export default function CustomersPage() {
  usePageTitle("Müşteriler");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const canManage = useCanManageCustomers();
  const customers = useCustomerList({
    q: q.trim() || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "true",
    page,
    pageSize: 25,
  });

  return (
    <PageFrame width="lg" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Operasyon
          </p>
          <h1
            className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
            style={displayFont}
          >
            Müşteriler
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
            Müşteri kartlarını sunucu tarafında arayın; tüm kayıtlar tarayıcıya
            yüklenmez.
          </p>
        </div>
        {canManage ? (
          <Link
            href="/settings/customers/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#3d7a8c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a]"
          >
            <UserPlus className="h-4 w-4" />
            Yeni müşteri
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="flex flex-wrap gap-3 border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-4 py-3 sm:px-5">
          <input
            aria-label="Müşteri ara"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
            placeholder="Ad, telefon veya e-posta ara"
            className={`min-w-64 flex-1 ${controlClass}`}
          />
          <select
            aria-label="Durum filtresi"
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value as typeof activeFilter);
              setPage(1);
            }}
            className={controlClass}
          >
            <option value="all">Tümü</option>
            <option value="true">Aktif</option>
            <option value="false">Pasif</option>
          </select>
        </div>

        <div className="p-4 sm:p-5">
          <QueryState
            isLoading={customers.isLoading}
            isError={customers.isError}
            onRetry={() => customers.refetch()}
            isEmpty={customers.data?.items.length === 0}
            loading="Müşteriler yükleniyor…"
            error="Müşteri bilgileri yüklenemedi."
            empty="Aramayla eşleşen müşteri yok."
          >
            {customers.data ? (
              <>
                <p className="mb-4 text-[13px] font-semibold text-[#5a7380]">
                  {customers.data.total} müşteri · sayfa {customers.data.page}/
                  {Math.max(customers.data.totalPages, 1)}
                </p>
                <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
                  {customers.data.items.map((customer) => (
                    <li key={customer.id}>
                      <Link
                        href={`/settings/customers/${customer.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-[#eef6f8]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-[#1e3340]">
                            {customer.firstName} {customer.lastName}
                          </p>
                          <p className="mt-0.5 truncate text-[13px] text-[#5a7380]">
                            {customer.phone ??
                              customer.email ??
                              "İletişim bilgisi yok"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Status active={customer.isActive} />
                          <ArrowRight className="h-4 w-4 text-[#7eb8c8]" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-2">
                  <PagerButton
                    disabled={page <= 1 || customers.isFetching}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Önceki
                  </PagerButton>
                  <PagerButton
                    disabled={!customers.data.hasMore || customers.isFetching}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Sonraki
                  </PagerButton>
                </div>
              </>
            ) : null}
          </QueryState>
        </div>
      </div>
    </PageFrame>
  );
}

function PagerButton({
  children,
  disabled,
  onClick,
}: {
  children: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-[#3d6b7a] ring-1 ring-[#c5dde6]/80 transition hover:bg-[#eef6f8] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Status({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active
          ? "bg-[#b8e6df]/45 text-[#2f5563]"
          : "bg-[#e4f0f4] text-[#5a7380]"
      }`}
    >
      {active ? "Aktif" : "Pasif"}
    </span>
  );
}
