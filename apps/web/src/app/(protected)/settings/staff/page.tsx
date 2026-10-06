"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, UserPlus } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { QueryState } from "@/components/ui/query-state";
import { useCanManageStaff, useStaffList } from "@/lib/staff/staff-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const controlClass =
  "rounded-xl bg-white px-3 py-2.5 text-sm text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

export default function StaffListPage() {
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const [roleFilter, setRoleFilter] = useState<"all" | "STAFF" | "ACCOUNTANT">(
    "all",
  );
  const canManage = useCanManageStaff();
  const staff = useStaffList({
    q: q.trim() || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "true",
    loginRole: roleFilter === "all" ? undefined : roleFilter,
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
            Ekip
          </p>
          <h1
            className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
            style={displayFont}
          >
            Personel
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
            Personel ve muhasebe kullanıcılarını oluşturun; detaydan e-posta
            daveti gönderin.
          </p>
        </div>
        {canManage ? (
          <Link
            href="/settings/staff/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#3d7a8c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a]"
          >
            <UserPlus className="h-4 w-4" />
            Yeni kullanıcı
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="flex flex-wrap gap-3 border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-4 py-3 sm:px-5">
          <input
            aria-label="Personel ara"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Ad, telefon veya e-posta ara"
            className={`min-w-64 flex-1 ${controlClass}`}
          />
          <select
            aria-label="Rol filtresi"
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as typeof roleFilter)
            }
            className={controlClass}
          >
            <option value="all">Tüm roller</option>
            <option value="STAFF">Personel</option>
            <option value="ACCOUNTANT">Muhasebe</option>
          </select>
          <select
            aria-label="Durum filtresi"
            value={activeFilter}
            onChange={(event) =>
              setActiveFilter(event.target.value as typeof activeFilter)
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
            isLoading={staff.isLoading}
            isError={staff.isError}
            onRetry={() => staff.refetch()}
            isEmpty={staff.data?.length === 0}
            loading="Personel yükleniyor…"
            error="Personel bilgileri yüklenemedi."
            empty="Henüz kayıt bulunmuyor."
          >
            {staff.data ? (
              <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
                {staff.data.map((person) => (
                  <li key={person.id}>
                    <Link
                      href={`/settings/staff/${person.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-[#eef6f8]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-[#1e3340]">
                          {person.firstName} {person.lastName}
                        </p>
                        <p className="mt-0.5 truncate text-[13px] text-[#5a7380]">
                          {person.phone ??
                            person.email ??
                            "İletişim bilgisi yok"}
                          {person.loginRole === "STAFF" &&
                          person.specializations.length > 0
                            ? ` · ${person.specializations
                                .map((item) => item.name)
                                .join(", ")}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <RoleBadge role={person.loginRole} />
                        <StatusBadge active={person.isActive} />
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

function RoleBadge({ role }: { role: "STAFF" | "ACCOUNTANT" }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        role === "ACCOUNTANT"
          ? "bg-[#e4f0f4] text-[#3d6b7a]"
          : "bg-[#b8e6df]/50 text-[#2f5563]"
      }`}
    >
      {role === "ACCOUNTANT" ? "Muhasebe" : "Personel"}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
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
