"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare, Pencil } from "lucide-react";
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

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const btnPrimary =
  "inline-flex items-center gap-2 rounded-xl bg-[#7eb8c8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6aa9bb] disabled:opacity-60";
const btnOutline =
  "inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5563] ring-1 ring-[#c5dde6] transition hover:bg-[#eef6f8] disabled:opacity-60";

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
        <p className="text-sm text-[#5a7380]">Kampanya yükleniyor…</p>
      </PageFrame>
    );
  }
  if (!campaign.data) {
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">Kampanya bulunamadı.</p>
      </PageFrame>
    );
  }

  const item = campaign.data;
  const names = (services.data ?? [])
    .filter((service) => item.serviceIds.includes(service.id))
    .map((service) => service.name);

  return (
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <Link
        href="/settings/campaigns"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Kampanya listesine dön
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Kampanya kartı
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
              {item.isActive ? "Aktif kampanya" : "Pasif kampanya"}
            </span>
          </div>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/settings/campaigns/${campaignId}/edit`}
              className={btnOutline}
            >
              <Pencil className="h-4 w-4" />
              Düzenle
            </Link>
            <button
              type="button"
              className={btnOutline}
              disabled={broadcasting || !item.smsTemplate}
              onClick={() => void sendBroadcast()}
            >
              <MessageSquare className="h-4 w-4" />
              {broadcasting ? "Gönderiliyor…" : "Toplu SMS"}
            </button>
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
            İndirim
          </dt>
          <dd className="mt-1 text-sm text-[#1e3340]">
            {item.discountType === "PERCENT"
              ? `%${item.discountValue}`
              : `${item.discountValue} TRY`}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Tarih
          </dt>
          <dd className="mt-1 text-sm text-[#1e3340]">
            {new Date(item.startsAt).toLocaleString("tr-TR")} –{" "}
            {new Date(item.endsAt).toLocaleString("tr-TR")}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Hizmetler
          </dt>
          <dd className="mt-1 text-sm text-[#1e3340]">
            {item.serviceIds.length === 0
              ? "Tüm hizmetler"
              : names.join(", ") || `${item.serviceIds.length} hizmet`}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            SMS şablonu
          </dt>
          <dd className="mt-1 text-sm text-[#1e3340]">
            {item.smsTemplate || "—"}
          </dd>
        </div>
      </dl>

      {canManage ? (
        <p className="mt-4 text-[13px] text-[#5a7380]">
          Toplu SMS yalnızca SMS rızası ve telefonu olan müşterilere gider.
          ACCOUNTANT gönderemez.
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
