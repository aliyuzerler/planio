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
import { updateCampaign } from "@/lib/campaigns/campaign-api";
import { broadcastCampaignSms } from "@/lib/invoicing/invoicing-api";
import {
  useCampaignDetail,
  useCanManageCampaigns,
} from "@/lib/campaigns/campaign-queries";
import { useServiceList } from "@/lib/services/service-queries";

export default function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const queryClient = useQueryClient();
  const campaign = useCampaignDetail(campaignId);
  const services = useServiceList({});
  const canManage = useCanManageCampaigns();
  const { pushToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  async function sendBroadcast() {
    setBroadcasting(true);
    try {
      const result = await broadcastCampaignSms(campaignId);
      pushToast(
        `Toplu SMS kuyruğa alındı: ${result.queued} alıcı · rıza yok ${result.skippedNoConsent} · telefon yok ${result.skippedNoPhone}.`,
      );
    } catch (cause) {
      pushToast(
        cause instanceof AppError ? cause.message : "Toplu SMS gönderilemedi.",
        "error",
      );
    } finally {
      setBroadcasting(false);
    }
  }

  async function toggleActive() {
    if (!campaign.data) return;
    setSaving(true);
    try {
      await updateCampaign(campaignId, { isActive: !campaign.data.isActive });
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
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

  if (campaign.isLoading) {
    return (
      <PageFrame>
        <p className="text-sm text-zinc-600">Kampanya yükleniyor…</p>
      </PageFrame>
    );
  }
  if (!campaign.data) {
    return (
      <PageFrame>
        <p className="text-sm text-zinc-600">Kampanya bulunamadı.</p>
      </PageFrame>
    );
  }

  const item = campaign.data;
  const names = (services.data ?? [])
    .filter((service) => item.serviceIds.includes(service.id))
    .map((service) => service.name);

  return (
    <PageFrame width="sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{item.name}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {item.isActive ? "Aktif kampanya" : "Pasif kampanya"}
          </p>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/settings/campaigns/${campaignId}/edit`}>Düzenle</Link>
            </Button>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setConfirm(true)}
            >
              {item.isActive ? "Pasifleştir" : "Aktifleştir"}
            </Button>
            <Button
              variant="outline"
              disabled={broadcasting || !item.smsTemplate}
              onClick={() => void sendBroadcast()}
            >
              {broadcasting ? "Gönderiliyor…" : "Toplu SMS"}
            </Button>
          </div>
        ) : null}
      </div>
      <dl className="mt-6 grid gap-4 rounded-xl border border-zinc-200 p-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-zinc-500">İndirim</dt>
          <dd className="mt-1 text-sm">
            {item.discountType === "PERCENT"
              ? `%${item.discountValue}`
              : `${item.discountValue} TRY`}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-500">Tarih</dt>
          <dd className="mt-1 text-sm">
            {new Date(item.startsAt).toLocaleString("tr-TR")} –{" "}
            {new Date(item.endsAt).toLocaleString("tr-TR")}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase text-zinc-500">Hizmetler</dt>
          <dd className="mt-1 text-sm">
            {item.serviceIds.length === 0
              ? "Tüm hizmetler"
              : names.join(", ") || `${item.serviceIds.length} hizmet`}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase text-zinc-500">SMS şablonu</dt>
          <dd className="mt-1 text-sm">{item.smsTemplate || "—"}</dd>
        </div>
      </dl>
      {canManage ? (
        <p className="mt-3 text-xs text-zinc-600">
          Toplu SMS yalnızca SMS rızası ve telefonu olan müşterilere gider. ACCOUNTANT
          gönderemez.
        </p>
      ) : null}
      <ConfirmDialog
        open={confirm}
        title={item.isActive ? "Kampanyayı pasifleştir" : "Kampanyayı aktifleştir"}
        description="Durum değişikliği yeni randevu fiyatlarını etkiler; mevcut snapshot değişmez."
        confirmLabel="Onayla"
        pending={saving}
        onCancel={() => setConfirm(false)}
        onConfirm={() => void toggleActive()}
      />
    </PageFrame>
  );
}
