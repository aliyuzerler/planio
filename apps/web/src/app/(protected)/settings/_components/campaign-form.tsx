"use client";

import { useState, type FormEvent } from "react";
import type {
  CampaignDiscountType,
  CampaignRecord,
  CreateCampaignInput,
} from "@xenior/types";
import {
  createCampaignInputSchema,
  normalizeServicePrice,
} from "@xenior/validation";
import { AppError } from "@/lib/api/errors";
import { useServiceList } from "@/lib/services/service-queries";
import { formatMoney } from "@/lib/money";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-[15px] text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

export function CampaignForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: CampaignRecord;
  submitLabel: string;
  onSubmit: (input: CreateCampaignInput) => Promise<void>;
}) {
  const services = useServiceList({ isActive: true });
  const [name, setName] = useState(initial?.name ?? "");
  const [discountType, setDiscountType] = useState<CampaignDiscountType>(
    initial?.discountType ?? "PERCENT",
  );
  const [discountValue, setDiscountValue] = useState(initial?.discountValue ?? "");
  const [startsAt, setStartsAt] = useState(
    initial ? toLocalInput(initial.startsAt) : "",
  );
  const [endsAt, setEndsAt] = useState(initial ? toLocalInput(initial.endsAt) : "");
  const [serviceIds, setServiceIds] = useState<string[]>(initial?.serviceIds ?? []);
  const [smsTemplate, setSmsTemplate] = useState(initial?.smsTemplate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = createCampaignInputSchema.safeParse({
      name,
      discountType,
      discountValue: normalizeServicePrice(discountValue),
      startsAt: fromLocalInput(startsAt),
      endsAt: fromLocalInput(endsAt),
      serviceIds,
      smsTemplate: smsTemplate || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (cause) {
      const text =
        cause instanceof AppError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : "İşlem tamamlanamadı.";
      setError(text);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
            Kampanya bilgileri
          </h2>
          <p className="mt-0.5 text-[13px] text-[#5a7380]">
            İndirim, tarih aralığı ve hedef hizmetler
          </p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380] sm:col-span-2">
            Kampanya adı
            <input
              required
              aria-label="Kampanya adı"
              maxLength={160}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
            İndirim türü
            <select
              aria-label="İndirim türü"
              value={discountType}
              onChange={(event) =>
                setDiscountType(event.target.value as CampaignDiscountType)
              }
              className={fieldClass}
            >
              <option value="PERCENT">Yüzde</option>
              <option value="AMOUNT">Tutar</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
            İndirim değeri
            <input
              required
              aria-label="İndirim değeri"
              value={discountValue}
              onChange={(event) => setDiscountValue(event.target.value)}
              placeholder={discountType === "PERCENT" ? "20.00" : "50.00"}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
            Başlangıç
            <input
              required
              aria-label="Kampanya başlangıç"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
            Bitiş
            <input
              required
              aria-label="Kampanya bitiş"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              className={fieldClass}
            />
          </label>
          <fieldset className="rounded-xl bg-[#F7FBFC] p-4 ring-1 ring-[#e4f0f4] sm:col-span-2">
            <legend className="px-1 text-[13px] font-semibold text-[#5a7380]">
              Hedef hizmetler
            </legend>
            <p className="mt-1 text-[12px] font-normal text-[#5a7380]">
              Hiçbiri seçilmezse kampanya tüm hizmetlere uygulanır.
            </p>
            <div className="mt-2 grid gap-2">
              {(services.data ?? []).map((service) => (
                <label
                  key={service.id}
                  className="flex items-center gap-2 text-sm text-[#1e3340]"
                >
                  <input
                    type="checkbox"
                    checked={serviceIds.includes(service.id)}
                    onChange={(event) => {
                      setServiceIds((current) =>
                        event.target.checked
                          ? [...current, service.id]
                          : current.filter((id) => id !== service.id),
                      );
                    }}
                    className="accent-[#7eb8c8]"
                  />
                  {service.name} ({formatMoney(service.price, service.currency)})
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380] sm:col-span-2">
            SMS şablonu (sonraki fazda gönderilir)
            <textarea
              aria-label="SMS şablonu"
              value={smsTemplate}
              onChange={(event) => setSmsTemplate(event.target.value)}
              rows={3}
              maxLength={1000}
              className={`${fieldClass} w-full resize-y`}
            />
          </label>
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

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}
