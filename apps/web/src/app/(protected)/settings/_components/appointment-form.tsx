"use client";

import { useMemo, useState, type FormEvent } from "react";
import type {
  AppointmentPaymentPlan,
  AppointmentRecord,
  CreateAppointmentInput,
} from "@xenior/types";
import { createAppointmentInputSchema } from "@xenior/validation";
import { Button } from "@xenior/ui";
import { AppError } from "@/lib/api/errors";
import { useCustomerList } from "@/lib/customers/customer-queries";
import { useResourceList, useBusinessRole } from "@/lib/resources/resource-queries";
import { usePriceQuote } from "@/lib/campaigns/campaign-queries";
import { useServiceList } from "@/lib/services/service-queries";
import { useStaffList } from "@/lib/staff/staff-queries";

export function AppointmentForm({
  initial,
  suggestedStartAt,
  suggestedStaffId,
  submitLabel,
  onSubmit,
}: {
  initial?: AppointmentRecord;
  suggestedStartAt?: string;
  suggestedStaffId?: string;
  submitLabel: string;
  onSubmit: (input: CreateAppointmentInput) => Promise<void>;
}) {
  const role = useBusinessRole();
  const staff = useStaffList({ isActive: true });
  const services = useServiceList({ isActive: true });
  const customers = useCustomerList({ isActive: true, pageSize: 100 });
  const resources = useResourceList({ isActive: true });
  const selfStaffId = staff.data?.find((item) => item.isSelf)?.id;
  const lockedStaffId = role === "STAFF" ? selfStaffId : undefined;
  const [customerId, setCustomerId] = useState(initial?.customer.id ?? "");
  const [staffId, setStaffId] = useState(
    lockedStaffId ?? initial?.staff.id ?? suggestedStaffId ?? "",
  );
  const [serviceId, setServiceId] = useState(initial?.service.id ?? "");
  const [resourceId, setResourceId] = useState(initial?.resource?.id ?? "");
  const [startLocal, setStartLocal] = useState(() => {
    if (initial) return toLocalInput(initial.startAt);
    if (suggestedStartAt && !Number.isNaN(new Date(suggestedStartAt).getTime())) {
      return toLocalInput(suggestedStartAt);
    }
    return "";
  });
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [paymentPlan, setPaymentPlan] = useState<AppointmentPaymentPlan>(
    initial?.paymentPlan ?? "ON_DAY",
  );
  const [depositAmount, setDepositAmount] = useState(
    initial?.depositAmount ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isCreate = !initial;

  const selectedService = useMemo(
    () => services.data?.find((item) => item.id === serviceId),
    [serviceId, services.data],
  );
  const startAtIso = startLocal ? fromLocalInput(startLocal) : "";
  const quote = usePriceQuote(serviceId, startAtIso);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const startAt = fromLocalInput(startLocal);
    const parsed = createAppointmentInputSchema.safeParse({
      customerId,
      staffId: lockedStaffId ?? staffId,
      serviceId,
      startAt,
      notes: notes || null,
      resourceId: resourceId || null,
      ...(isCreate
        ? {
            paymentPlan,
            depositAmount:
              paymentPlan === "DEPOSIT" ? depositAmount || null : null,
          }
        : {}),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (cause) {
      setError(
        cause instanceof AppError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : "İşlem tamamlanamadı.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-xl border border-zinc-200 p-6 sm:grid-cols-2"
    >
      <label className="flex flex-col gap-1 text-sm">
        Müşteri
        <select
          required
          aria-label="Müşteri"
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        >
          <option value="">Müşteri seçin</option>
          {(customers.data?.items ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.firstName} {item.lastName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Personel
        <select
          required
          aria-label="Personel"
          value={lockedStaffId ?? staffId}
          disabled={Boolean(lockedStaffId)}
          onChange={(event) => setStaffId(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        >
          <option value="">Personel seçin</option>
          {(staff.data ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.firstName} {item.lastName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Hizmet
        <select
          required
          aria-label="Hizmet"
          value={serviceId}
          onChange={(event) => setServiceId(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        >
          <option value="">Hizmet seçin</option>
          {(services.data ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.durationMinutes} dk)
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Kaynak (isteğe bağlı)
        <select
          aria-label="Kaynak"
          value={resourceId}
          onChange={(event) => setResourceId(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        >
          <option value="">Kaynak yok</option>
          {(resources.data ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Başlangıç
        <input
          required
          aria-label="Başlangıç"
          type="datetime-local"
          value={startLocal}
          onChange={(event) => setStartLocal(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <p className="text-sm text-zinc-600 sm:col-span-2">
        Bitiş saati hizmet süresinden hesaplanır
        {selectedService ? ` (${selectedService.durationMinutes} dakika).` : "."}
      </p>
      {quote.data ? (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-950 sm:col-span-2">
          {quote.data.campaignId
            ? `Kampanya: ${quote.data.campaignName} · Liste ${quote.data.listPrice} ${quote.data.currency} · İndirim ${quote.data.discountAmount} · Ödenecek ${quote.data.payableAmount} ${quote.data.currency}`
            : `Ücret: ${quote.data.payableAmount} ${quote.data.currency}`}
        </p>
      ) : null}
      {isCreate ? (
        <fieldset className="grid gap-2 rounded-md border border-zinc-200 p-3 sm:col-span-2">
          <legend className="px-1 text-sm font-medium">Ödeme planı</legend>
          {(
            [
              ["ON_DAY", "Gününde"],
              ["DEPOSIT", "Kapora"],
              ["FULL", "Tamamı peşin"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="paymentPlan"
                value={value}
                checked={paymentPlan === value}
                onChange={() => setPaymentPlan(value)}
              />
              {label}
            </label>
          ))}
          {paymentPlan === "DEPOSIT" ? (
            <label className="mt-2 flex flex-col gap-1 text-sm">
              Kapora tutarı
              <input
                required
                aria-label="Kapora tutarı"
                value={depositAmount}
                placeholder={quote.data?.payableAmount ?? "150.00"}
                onChange={(event) => setDepositAmount(event.target.value)}
                className="rounded-md border border-zinc-300 px-3 py-2"
              />
            </label>
          ) : null}
        </fieldset>
      ) : null}
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Notlar
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          maxLength={5000}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-700 sm:col-span-2">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={submitting} className="sm:col-span-2">
        {submitting ? "Kaydediliyor…" : submitLabel}
      </Button>
    </form>
  );
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}
