"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import type {
  AppointmentPaymentPlan,
  AppointmentRecord,
  CreateAppointmentInput,
} from "@xenior/types";
import { createAppointmentInputSchema } from "@xenior/validation";
import { AppError } from "@/lib/api/errors";
import { useCustomerList } from "@/lib/customers/customer-queries";
import { useResourceList, useBusinessRole } from "@/lib/resources/resource-queries";
import { usePriceQuote } from "@/lib/campaigns/campaign-queries";
import { useServiceList } from "@/lib/services/service-queries";
import { useStaffList } from "@/lib/staff/staff-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-[15px] text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

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
  const staff = useStaffList({ isActive: true, loginRole: "STAFF" });
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
    <form onSubmit={handleSubmit} className="grid gap-5">
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
            Randevu bilgileri
          </h2>
          <p className="mt-0.5 text-[13px] text-[#5a7380]">
            Müşteri, personel, hizmet ve başlangıç saati
          </p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Müşteri">
            <select
              required
              aria-label="Müşteri"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className={fieldClass}
            >
              <option value="">Müşteri seçin</option>
              {(customers.data?.items ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.firstName} {item.lastName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Personel">
            <select
              required
              aria-label="Personel"
              value={lockedStaffId ?? staffId}
              disabled={Boolean(lockedStaffId)}
              onChange={(event) => setStaffId(event.target.value)}
              className={`${fieldClass} disabled:opacity-60`}
            >
              <option value="">Personel seçin</option>
              {(staff.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.firstName} {item.lastName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Hizmet">
            <select
              required
              aria-label="Hizmet"
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              className={fieldClass}
            >
              <option value="">Hizmet seçin</option>
              {(services.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.durationMinutes} dk)
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kaynak (isteğe bağlı)">
            <select
              aria-label="Kaynak"
              value={resourceId}
              onChange={(event) => setResourceId(event.target.value)}
              className={fieldClass}
            >
              <option value="">Kaynak yok</option>
              {(resources.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Başlangıç">
            <input
              required
              aria-label="Başlangıç"
              type="datetime-local"
              value={startLocal}
              onChange={(event) => setStartLocal(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <div className="flex items-end">
            <p className="rounded-xl bg-[#eef6f8] px-3 py-2.5 text-[13px] leading-5 text-[#5a7380]">
              Bitiş saati hizmet süresinden hesaplanır
              {selectedService
                ? ` (${selectedService.durationMinutes} dakika).`
                : "."}
            </p>
          </div>
          {quote.data ? (
            <div className="rounded-xl bg-[#b8e6df]/35 px-4 py-3 text-[13px] leading-5 text-[#2f5563] sm:col-span-2">
              {quote.data.campaignId
                ? `Kampanya: ${quote.data.campaignName} · Liste ${quote.data.listPrice} ${quote.data.currency} · İndirim ${quote.data.discountAmount} · Ödenecek ${quote.data.payableAmount} ${quote.data.currency}`
                : `Ücret: ${quote.data.payableAmount} ${quote.data.currency}`}
            </div>
          ) : null}
        </div>
      </section>

      {isCreate ? (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
          <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
            <h2
              className="text-lg font-semibold text-[#2f5563]"
              style={displayFont}
            >
              Ödeme planı
            </h2>
            <p className="mt-0.5 text-[13px] text-[#5a7380]">
              Randevu oluşturulurken tahsilat beklentisini belirleyin
            </p>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {(
              [
                ["ON_DAY", "Gününde", "İşlem günü tahsilat"],
                ["DEPOSIT", "Kapora", "Ön ödeme alınır"],
                ["FULL", "Peşin", "Tamamı peşin"],
              ] as const
            ).map(([value, label, hint]) => {
              const active = paymentPlan === value;
              return (
                <label
                  key={value}
                  className={`cursor-pointer rounded-xl px-4 py-3 ring-1 transition ${
                    active
                      ? "bg-[#eef6f8] ring-[#7eb8c8]"
                      : "bg-white ring-[#c5dde6]/70 hover:bg-[#F7FBFC]"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentPlan"
                    value={value}
                    checked={active}
                    onChange={() => setPaymentPlan(value)}
                    className="sr-only"
                  />
                  <span className="block text-[15px] font-semibold text-[#2f5563]">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[#5a7380]">
                    {hint}
                  </span>
                </label>
              );
            })}
            {paymentPlan === "DEPOSIT" ? (
              <Field label="Kapora tutarı" className="sm:col-span-3">
                <input
                  required
                  aria-label="Kapora tutarı"
                  value={depositAmount}
                  placeholder={quote.data?.payableAmount ?? "150.00"}
                  onChange={(event) => setDepositAmount(event.target.value)}
                  className={fieldClass}
                />
              </Field>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
            Notlar
          </h2>
        </div>
        <div className="p-5">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            maxLength={5000}
            className={`${fieldClass} w-full resize-y`}
            placeholder="Opsiyonel notlar…"
          />
        </div>
      </section>

      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center rounded-xl bg-[#3d7a8c] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a] disabled:opacity-60"
      >
        {submitting ? "Kaydediliyor…" : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380] ${className}`}>
      {label}
      {children}
    </label>
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
