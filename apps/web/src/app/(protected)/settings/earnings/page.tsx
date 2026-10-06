"use client";

import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { QueryState } from "@/components/ui/query-state";
import { useCommissionEntries } from "@/lib/commissions/commission-queries";
import { useAuthStore } from "@/stores/auth-store";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

export default function EarningsPage() {
  const entries = useCommissionEntries();
  const role = useAuthStore((state) =>
    state.memberships.find((item) => item.businessId === state.selectedBusinessId)
      ?.role,
  );
  const canOpenAppointment = role !== "ACCOUNTANT";
  const canPay = role === "BUSINESS_OWNER" || role === "ACCOUNTANT";

  return (
    <PageFrame width="lg" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <div>
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          Prim
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          Hakediş
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          Tamamlanan randevulardan oluşan prim satırları. Ödeme gider olarak
          kasadan çıkar.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="p-4 sm:p-5">
          <QueryState
            isLoading={entries.isLoading}
            isError={entries.isError}
            onRetry={() => entries.refetch()}
            isEmpty={entries.data?.items.length === 0}
            loading="Hakediş yükleniyor…"
            error="Hakediş yüklenemedi."
            empty="Henüz prim satırı yok. Tamamlanan randevu ve aktif kural gerekir."
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
                        {entry.staffNameSnapshot}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-[#5a7380]">
                        {canOpenAppointment && entry.appointmentId ? (
                          <Link
                            href={`/settings/appointments/${entry.appointmentId}`}
                            className="font-medium text-[#3d6b7a] hover:text-[#2f5563]"
                          >
                            {entry.serviceNameSnapshot}
                          </Link>
                        ) : (
                          entry.serviceNameSnapshot
                        )}
                        {" · "}
                        {entry.ruleNameSnapshot}
                        {" · "}
                        {new Date(entry.earnedAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-[15px] font-semibold text-[#2f5563]">
                        {entry.amount} {entry.currency}
                      </p>
                      {canPay ? (
                        entry.payoutExpenseId ? (
                          <span className="inline-flex items-center rounded-xl bg-[#eef6f8] px-3 py-1.5 text-[13px] font-semibold text-[#3d6b7a]">
                            Ödendi
                          </span>
                        ) : (
                          <Link
                            href={`/settings/expenses/new?category=COMMISSION&amount=${entry.amount}&commissionEntryId=${entry.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#3d7a8c] px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#33687a]"
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            Öde
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )
                      ) : null}
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
