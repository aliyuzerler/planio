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
import { updateService } from "@/lib/services/service-api";
import {
  useCanManageServices,
  useServiceDetail,
} from "@/lib/services/service-queries";

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

  if (service.isLoading) return <PageFrame>Yükleniyor…</PageFrame>;
  if (!service.data) return <PageFrame>Hizmet bulunamadı.</PageFrame>;
  const item = service.data;

  return (
    <PageFrame width="sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{item.name}</h1>
          <p className="text-sm text-zinc-600">
            {item.isActive ? "Aktif hizmet" : "Pasif hizmet"}
          </p>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/settings/services/${serviceId}/edit`}>
                Düzenle
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmToggle(true)}
              disabled={saving}
            >
              {item.isActive ? "Pasifleştir" : "Aktifleştir"}
            </Button>
          </div>
        ) : null}
      </div>
      {!canManage ? (
        <p className="mt-6 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          STAFF rolü hizmet bilgilerini görüntüleyebilir ancak değiştiremez.
        </p>
      ) : null}
      <dl className="mt-6 grid gap-4 rounded-xl border border-zinc-200 p-6 sm:grid-cols-2">
        <Info label="Süre" value={`${item.durationMinutes} dakika`} />
        <Info label="Fiyat" value={`${item.price} ${item.currency}`} />
        <Info label="Açıklama" value={item.description ?? "—"} wide />
      </dl>
      {message ? (
        <p role="status" className="mt-4 text-sm">
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
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs uppercase text-zinc-500">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
