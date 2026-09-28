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
import { updateService } from "@/lib/services/service-api";
import {
  useCanManageServices,
  useServiceDetail,
} from "@/lib/services/service-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

export default function ServiceDetailPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const queryClient = useQueryClient();
  const service = useServiceDetail(serviceId);
  const canManage = useCanManageServices();
  const { pushToast } = useToast();
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);

  async function toggleActive() {
    if (!service.data) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateService(serviceId, {
        isActive: !service.data.isActive,
      });
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      setMessage("Değişiklik kaydedildi.");
      pushToast("Değişiklik kaydedildi.");
    } catch (cause) {
      const text =
        cause instanceof AppError ? cause.message : "İşlem tamamlanamadı.";
      setMessage(text);
      pushToast(text, "error");
    } finally {
      setSaving(false);
      setConfirmToggle(false);
    }
  }

  if (service.isLoading) {
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">Yükleniyor…</p>
      </PageFrame>
    );
  }
  if (!service.data) {
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">Hizmet bulunamadı.</p>
      </PageFrame>
    );
  }
  const item = service.data;

  return (
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <Link
        href="/settings/services"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Hizmet listesine dön
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Hizmet kartı
          </p>
          <h1
            className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
            style={displayFont}
          >
            {item.name}
          </h1>
          <div className="mt-2">
            <StatusBadge active={item.isActive} />
          </div>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/settings/services/${serviceId}/edit`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5563] shadow-sm ring-1 ring-[#c5dde6]/80 transition hover:bg-[#eef6f8]"
            >
              <Pencil className="h-4 w-4" />
              Düzenle
            </Link>
            <button
              type="button"
              onClick={() => setConfirmToggle(true)}
              disabled={saving}
              className="inline-flex items-center rounded-xl bg-[#7eb8c8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6aa9bb] disabled:opacity-60"
            >
              {item.isActive ? "Pasifleştir" : "Aktifleştir"}
            </button>
          </div>
        ) : null}
      </div>

      {!canManage ? (
        <p className="mt-6 rounded-xl bg-[#eef6f8] px-4 py-3 text-sm leading-6 text-[#3d6b7a] ring-1 ring-[#c5dde6]/70">
          Personel rolü hizmet bilgilerini görüntüleyebilir ancak değiştiremez.
        </p>
      ) : null}

      <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
            Detaylar
          </h2>
        </div>
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <Info label="Süre" value={`${item.durationMinutes} dakika`} />
          <Info label="Fiyat" value={`${item.price} ${item.currency}`} />
          <Info label="Açıklama" value={item.description ?? "—"} wide />
        </dl>
      </section>

      {message ? (
        <p role="status" className="mt-4 text-sm font-medium text-[#3d6b7a]">
          {message}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirmToggle}
        title={item.isActive ? "Hizmeti pasifleştir" : "Hizmeti aktifleştir"}
        description="Durum değişikliği sunucuda kaydedilir."
        confirmLabel="Onayla"
        pending={saving}
        onCancel={() => setConfirmToggle(false)}
        onConfirm={() => void toggleActive()}
      />
    </PageFrame>
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
      {active ? "Aktif hizmet" : "Pasif hizmet"}
    </span>
  );
}

function Info({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-xl bg-[#F7FBFC] px-4 py-3 ring-1 ring-[#e4f0f4] ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#7eb8c8]">
        {label}
      </dt>
      <dd className="mt-1 text-[15px] font-medium text-[#1e3340]">{value}</dd>
    </div>
  );
}
