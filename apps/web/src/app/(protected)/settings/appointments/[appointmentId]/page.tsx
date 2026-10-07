"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { CreateAppointmentInput } from "@xenior/types";
import { Button } from "@xenior/ui";
import { AppointmentForm } from "@/app/(protected)/settings/_components/appointment-form";
import { AppointmentStatusBadge } from "@/app/(protected)/settings/_components/appointment-status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageFrame } from "@/components/ui/page-frame";
import { useToast } from "@/components/ui/toast";
import { AppError } from "@/lib/api/errors";
import {
  cancelAppointment,
  completeAppointment,
  createAppointmentPaymentLink,
  markAppointmentNoShow,
  rescheduleAppointment,
} from "@/lib/appointments/appointment-api";
import { useAppointmentDetail } from "@/lib/appointments/appointment-queries";
import { appointmentEventLabel } from "@/lib/appointments/appointment-status";
import { useSaleList } from "@/lib/ledger/ledger-queries";
import { formatMoney } from "@/lib/money";

export default function AppointmentDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const appointment = useAppointmentDetail(appointmentId);
  const relatedSale = useSaleList({ appointmentId })
    .data?.pages.flatMap((page) => page.items)[0];
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function run(operation: () => Promise<unknown>, success: string) {
    setMessage(null);
    setSaving(true);
    try {
      await operation();
      await refresh();
      setMessage(success);
      pushToast(success);
    } catch (cause) {
      const text =
        cause instanceof AppError ? cause.message : "İşlem tamamlanamadı.";
      setMessage(text);
      pushToast(text, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleReschedule(input: CreateAppointmentInput) {
    await rescheduleAppointment(appointmentId, {
      customerId: input.customerId,
      staffId: input.staffId,
      serviceId: input.serviceId,
      startAt: input.startAt,
      resourceId: input.resourceId ?? null,
    });
    await refresh();
    setRescheduling(false);
    setMessage("Randevu yeniden planlandı.");
    pushToast("Randevu yeniden planlandı.");
  }

  if (appointment.isLoading) {
    return <PageFrame>Randevu yükleniyor…</PageFrame>;
  }
  if (appointment.isError || !appointment.data) {
    return (
      <PageFrame>
        <p role="alert" className="text-sm text-red-700">
          Randevu bulunamadı.
        </p>
      </PageFrame>
    );
  }

  const item = appointment.data;
  const confirmed = item.status === "CONFIRMED";

  return (
    <PageFrame width="sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {item.customer.firstName} {item.customer.lastName}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {new Date(item.startAt).toLocaleString("tr-TR")} –{" "}
            {new Date(item.endAt).toLocaleTimeString("tr-TR")}
          </p>
        </div>
        <AppointmentStatusBadge status={item.status} />
      </div>

      <dl className="mt-6 grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-zinc-500">Personel</dt>
          <dd className="mt-1 text-sm">
            {item.staff.firstName} {item.staff.lastName}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-500">Hizmet</dt>
          <dd className="mt-1 text-sm">{item.serviceNameSnapshot}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-500">Kaynak</dt>
          <dd className="mt-1 text-sm">{item.resource?.name || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-500">Ücret</dt>
          <dd className="mt-1 text-sm">
            {formatMoney(item.servicePriceSnapshot, item.currency)}
            {item.discountAmountSnapshot !== "0.00"
              ? ` · liste ${item.listPriceSnapshot}, indirim ${item.discountAmountSnapshot}${item.campaignNameSnapshot ? ` (${item.campaignNameSnapshot})` : ""}`
              : ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-500">Ödeme</dt>
          <dd className="mt-1 text-sm">
            {item.paymentPlan === "DEPOSIT"
              ? `Kapora${item.depositAmount ? ` ${item.depositAmount}` : ""}`
              : item.paymentPlan === "FULL"
                ? "Tamamı peşin"
                : "Gününde"}
            {" · "}
            {item.paymentStatus === "PAID"
              ? "Ödendi"
              : item.paymentStatus === "PARTIAL"
                ? "Kısmi"
                : "Ödenmedi"}
            {item.remainingAmount !== "0.00"
              ? ` · kalan ${formatMoney(item.remainingAmount, item.currency)}`
              : ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-500">Notlar</dt>
          <dd className="mt-1 text-sm">{item.notes || "—"}</dd>
        </div>
        {relatedSale ? (
          <div>
            <dt className="text-xs uppercase text-zinc-500">Satış</dt>
            <dd className="mt-1 text-sm">
              <Link
                href={`/settings/sales/${relatedSale.id}`}
                className="underline"
              >
                {relatedSale.remainingAmount === "0.00"
                  ? "Tahsil edildi"
                  : `Açık ${formatMoney(relatedSale.remainingAmount, relatedSale.currency)}`}
              </Link>
            </dd>
          </div>
        ) : null}
      </dl>

      {confirmed ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => setRescheduling((value) => !value)}
          >
            Yeniden planla
          </Button>
          {item.remainingAmount !== "0.00" ? (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() =>
                run(async () => {
                  const link = await createAppointmentPaymentLink(appointmentId);
                  setPaymentLink(link.url);
                }, "Ödeme bağlantısı hazır.")
              }
            >
              Ödeme linki gönder
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => {
              if (item.remainingAmount !== "0.00") {
                setConfirmComplete(true);
                return;
              }
              void run(() => completeAppointment(appointmentId), "Randevu tamamlandı.");
            }}
          >
            Tamamla
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() =>
              run(() => markAppointmentNoShow(appointmentId), "Gelmedi olarak işaretlendi.")
            }
          >
            Gelmedi
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => setConfirmCancel(true)}
          >
            İptal et
          </Button>
        </div>
      ) : null}

      {rescheduling ? (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Yeniden planla</h2>
          <AppointmentForm
            initial={item}
            submitLabel="Yeni saati kaydet"
            onSubmit={handleReschedule}
          />
        </div>
      ) : null}

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Geçmiş</h2>
        <ul className="mt-3 grid gap-2 text-sm">
          {(item.events ?? []).map((event) => (
            <li key={event.id}>
              {appointmentEventLabel(event.type)}
              {event.newStartAt
                ? ` · ${new Date(event.newStartAt).toLocaleString("tr-TR")}`
                : ""}
            </li>
          ))}
        </ul>
      </section>
      {paymentLink ? (
        <p className="mt-4 break-all text-sm text-emerald-800">
          Ödeme linki: {paymentLink}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mt-4 text-sm text-zinc-700">
          {message}
        </p>
      ) : null}
      <button
        type="button"
        className="mt-6 text-sm underline"
        onClick={() => router.push("/settings/appointments")}
      >
        Takvime dön
      </button>
      <ConfirmDialog
        open={confirmCancel}
        title="Randevuyu iptal et"
        description="İptal işlemi sunucuda kaydedilir ve geri alınamaz."
        confirmLabel="Onayla"
        pending={saving}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          void run(() => cancelAppointment(appointmentId), "Randevu iptal edildi.");
        }}
      />
      <ConfirmDialog
        open={confirmComplete}
        title="Kalan tutar var"
        description={`Gününde kalan ${formatMoney(item.remainingAmount, item.currency)}. Tamamlamak tahsilatı engellemez; nakit, POS veya yeni link ile kapatabilirsiniz.`}
        confirmLabel="Yine de tamamla"
        pending={saving}
        onCancel={() => setConfirmComplete(false)}
        onConfirm={() => {
          setConfirmComplete(false);
          void run(() => completeAppointment(appointmentId), "Randevu tamamlandı.");
        }}
      />
    </PageFrame>
  );
}
