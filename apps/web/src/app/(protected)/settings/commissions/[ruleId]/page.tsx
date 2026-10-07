"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageFrame } from "@/components/ui/page-frame";
import { useToast } from "@/components/ui/toast";
import { AppError } from "@/lib/api/errors";
import { updateCommissionRule } from "@/lib/commissions/commission-api";
import {
  useCanManageCommissions,
  useCommissionRuleDetail,
} from "@/lib/commissions/commission-queries";
import { useServiceList } from "@/lib/services/service-queries";
import { formatTry } from "@/lib/money";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const btnPrimary =
  "inline-flex items-center gap-2 rounded-xl bg-[#3d7a8c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a] disabled:opacity-60";
const btnOutline =
  "inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5563] ring-1 ring-[#c5dde6] transition hover:bg-[#eef6f8] disabled:opacity-60";

export default function CommissionRuleDetailPage() {
  const { ruleId } = useParams<{ ruleId: string }>();
  const queryClient = useQueryClient();
  const rule = useCommissionRuleDetail(ruleId);
  const services = useServiceList({});
  const canManage = useCanManageCommissions();
  const { pushToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function toggleActive() {
    if (!rule.data) return;
    setSaving(true);
    try {
      await updateCommissionRule(ruleId, { isActive: !rule.data.isActive });
      await queryClient.invalidateQueries({ queryKey: ["commission-rules"] });
      pushToast("Değişiklik kaydedildi.");
    } catch (cause) {
      pushToast(
        cause instanceof AppError ? cause.message : "İşlem tamamlanamadı.",
        "error",
      );
    } finally {
      setSaving(false);
      setConfirm(false);
    }
  }

  if (rule.isLoading) {
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">Prim kuralı yükleniyor…</p>
      </PageFrame>
    );
  }
  if (!rule.data) {
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">Prim kuralı bulunamadı.</p>
      </PageFrame>
    );
  }

  const item = rule.data;
  const serviceName = item.serviceId
    ? (services.data ?? []).find((service) => service.id === item.serviceId)
        ?.name
    : null;

  return (
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <Link
        href="/settings/commissions"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Prim kurallarına dön
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Prim kuralı
          </p>
          <h1
            className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
            style={displayFont}
          >
            {item.name}
          </h1>
          <div className="mt-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                item.isActive
                  ? "bg-[#b8e6df]/45 text-[#2f5563]"
                  : "bg-[#e4f0f4] text-[#5a7380]"
              }`}
            >
              {item.isActive ? "Aktif kural" : "Pasif kural"}
            </span>
          </div>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/settings/commissions/${ruleId}/edit`}
              className={btnOutline}
            >
              <Pencil className="h-4 w-4" />
              Düzenle
            </Link>
            <button
              type="button"
              className={btnPrimary}
              disabled={saving}
              onClick={() => setConfirm(true)}
            >
              {item.isActive ? "Pasifleştir" : "Aktifleştir"}
            </button>
          </div>
        ) : null}
      </div>

      <dl className="mt-6 grid gap-4 overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#c5dde6]/70 sm:grid-cols-2 sm:p-6">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Prim
          </dt>
          <dd className="mt-1 text-sm text-[#1e3340]">
            {item.commissionType === "PERCENT"
              ? `%${item.commissionValue}`
              : formatTry(item.commissionValue)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Hizmet
          </dt>
          <dd className="mt-1 text-sm text-[#1e3340]">
            {item.serviceId ? serviceName || "Hizmet" : "Tüm hizmetler"}
          </dd>
        </div>
      </dl>

      <ConfirmDialog
        open={confirm}
        title={item.isActive ? "Kuralı pasifleştir" : "Kuralı aktifleştir"}
        description="Durum değişikliği yeni tamamlanan randevuları etkiler; mevcut hakediş satırları değişmez."
        confirmLabel="Onayla"
        pending={saving}
        onCancel={() => setConfirm(false)}
        onConfirm={() => void toggleActive()}
      />
    </PageFrame>
  );
}
