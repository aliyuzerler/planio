"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@xenior/ui";
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
        <p className="text-sm text-zinc-600">Prim kuralı yükleniyor…</p>
      </PageFrame>
    );
  }
  if (!rule.data) {
    return (
      <PageFrame>
        <p className="text-sm text-zinc-600">Prim kuralı bulunamadı.</p>
      </PageFrame>
    );
  }

  const item = rule.data;
  const serviceName = item.serviceId
    ? (services.data ?? []).find((service) => service.id === item.serviceId)
        ?.name
    : null;

  return (
    <PageFrame width="sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{item.name}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {item.isActive ? "Aktif kural" : "Pasif kural"}
          </p>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/settings/commissions/${ruleId}/edit`}>Düzenle</Link>
            </Button>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setConfirm(true)}
            >
              {item.isActive ? "Pasifleştir" : "Aktifleştir"}
            </Button>
          </div>
        ) : null}
      </div>
      <dl className="mt-6 grid gap-4 rounded-xl border border-zinc-200 p-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-zinc-500">Prim</dt>
          <dd className="mt-1 text-sm">
            {item.commissionType === "PERCENT"
              ? `%${item.commissionValue}`
              : `${item.commissionValue} TRY`}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-500">Hizmet</dt>
          <dd className="mt-1 text-sm">
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
