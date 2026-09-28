"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Percent } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { QueryState } from "@/components/ui/query-state";
import {
  useCanManageCommissions,
  useCommissionRuleList,
} from "@/lib/commissions/commission-queries";
import { useServiceList } from "@/lib/services/service-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const controlClass =
  "rounded-xl bg-white px-3 py-2.5 text-sm text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

export default function CommissionRulesPage() {
  const [active, setActive] = useState<"all" | "true" | "false">("all");
  const canManage = useCanManageCommissions();
  const rules = useCommissionRuleList(
    active === "all" ? undefined : active === "true",
  );
  const services = useServiceList({});

  return (
    <PageFrame width="lg" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Prim
          </p>
          <h1
            className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
            style={displayFont}
          >
            Prim kuralları
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
            Tamamlanan randevuda hizmete göre yüzde veya tutar prim satırı
            oluşur.
          </p>
        </div>
        {canManage ? (
          <Link
            href="/settings/commissions/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#7eb8c8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6aa9bb]"
          >
            <Percent className="h-4 w-4" />
            Yeni kural
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="flex flex-wrap gap-3 border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-4 py-3 sm:px-5">
          <select
            aria-label="Durum filtresi"
            value={active}
            onChange={(event) =>
              setActive(event.target.value as typeof active)
            }
            className={controlClass}
          >
            <option value="all">Tümü</option>
            <option value="true">Aktif</option>
            <option value="false">Pasif</option>
          </select>
        </div>

        <div className="p-4 sm:p-5">
          <QueryState
            isLoading={rules.isLoading}
            isError={rules.isError}
            isEmpty={rules.data?.length === 0}
            loading="Prim kuralları yükleniyor…"
            error="Prim kuralları yüklenemedi."
            empty="Henüz prim kuralı yok."
          >
            {rules.data ? (
              <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
                {rules.data.map((rule) => (
                  <li key={rule.id}>
                    <Link
                      href={`/settings/commissions/${rule.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-[#eef6f8]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-[#1e3340]">
                          {rule.name}
                        </p>
                        <p className="mt-0.5 truncate text-[13px] text-[#5a7380]">
                          {rule.serviceId
                            ? (services.data ?? []).find(
                                (service) => service.id === rule.serviceId,
                              )?.name ?? "Hizmet"
                            : "Tüm hizmetler"}
                          {" · "}
                          {rule.commissionType === "PERCENT"
                            ? `%${rule.commissionValue}`
                            : `${rule.commissionValue} TRY`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            rule.isActive
                              ? "bg-[#b8e6df]/45 text-[#2f5563]"
                              : "bg-[#e4f0f4] text-[#5a7380]"
                          }`}
                        >
                          {rule.isActive ? "Aktif" : "Pasif"}
                        </span>
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
    </PageFrame>
  );
}
