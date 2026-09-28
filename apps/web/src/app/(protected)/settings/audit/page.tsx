"use client";

import { useState } from "react";
import { PageFrame } from "@/components/ui/page-frame";
import { QueryState } from "@/components/ui/query-state";
import {
  AUDIT_ACTION_FILTER_OPTIONS,
  auditActionLabel,
  formatAuditDetail,
} from "@/lib/reports/audit-labels";
import { useTenantAuditLogs } from "@/lib/reports/reports-queries";
import { useAuthStore } from "@/stores/auth-store";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const controlClass =
  "rounded-xl bg-white px-3 py-2.5 text-sm text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

export default function AuditLogsPage() {
  const role = useAuthStore((state) =>
    state.memberships.find((item) => item.businessId === state.selectedBusinessId)
      ?.role,
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [action, setAction] = useState("");
  const logs = useTenantAuditLogs({
    from: from || undefined,
    to: to || undefined,
    action: action || undefined,
  });

  if (role !== "BUSINESS_OWNER") {
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">
          Denetim kaydı yalnızca işletme sahibine açıktır.
        </p>
      </PageFrame>
    );
  }

  const hasFilters = Boolean(from || to || action);

  return (
    <PageFrame width="lg" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <div>
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          Güvenlik
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          Denetim kaydı
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          İşletme içi işlem izi. Tarih ve işlem türüne göre süzebilirsiniz.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="flex flex-wrap items-end gap-3 border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-4 py-3 sm:px-5">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
            Başlangıç
            <input
              type="date"
              aria-label="Başlangıç tarihi"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={controlClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
            Bitiş
            <input
              type="date"
              aria-label="Bitiş tarihi"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={controlClass}
            />
          </label>
          <label className="flex min-w-[14rem] flex-1 flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
            İşlem türü
            <select
              aria-label="İşlem türü filtresi"
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className={controlClass}
            >
              <option value="">Tüm işlemler</option>
              {AUDIT_ACTION_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
                setAction("");
              }}
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5563] ring-1 ring-[#c5dde6] transition hover:bg-[#eef6f8]"
            >
              Temizle
            </button>
          ) : null}
        </div>

        <div className="p-4 sm:p-5">
          <QueryState
            isLoading={logs.isLoading}
            isError={logs.isError}
            isEmpty={logs.data?.items.length === 0}
            loading="Denetim kaydı yükleniyor…"
            error="Denetim kaydı yüklenemedi."
            empty={
              hasFilters
                ? "Bu filtrelere uyan kayıt yok."
                : "Henüz denetim kaydı yok."
            }
          >
            {logs.data ? (
              <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
                {logs.data.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-[#1e3340]">
                        {auditActionLabel(item.action)}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-5 text-[#5a7380]">
                        {formatAuditDetail(item.entityType, item.summary)}
                      </p>
                    </div>
                    <p className="shrink-0 text-[13px] tabular-nums text-[#5a7380]">
                      {new Date(item.createdAt).toLocaleString("tr-TR")}
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
