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
import { Button } from "@xenior/ui";
import { AppError } from "@/lib/api/errors";
import { useServiceList } from "@/lib/services/service-queries";

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
      setError(
        cause instanceof AppError ? cause.message : "İşlem tamamlanamadı.",
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
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Kampanya adı
        <input
          required
          aria-label="Kampanya adı"
          maxLength={160}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        İndirim türü
        <select
          aria-label="İndirim türü"
          value={discountType}
          onChange={(event) =>
            setDiscountType(event.target.value as CampaignDiscountType)
          }
          className="rounded-md border border-zinc-300 px-3 py-2"
        >
          <option value="PERCENT">Yüzde</option>
          <option value="AMOUNT">Tutar</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        İndirim değeri
        <input
          required
          aria-label="İndirim değeri"
          value={discountValue}
          onChange={(event) => setDiscountValue(event.target.value)}
          placeholder={discountType === "PERCENT" ? "20.00" : "50.00"}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Başlangıç
        <input
          required
          aria-label="Kampanya başlangıç"
          type="datetime-local"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Bitiş
        <input
          required
          aria-label="Kampanya bitiş"
          type="datetime-local"
          value={endsAt}
          onChange={(event) => setEndsAt(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm">Hedef hizmetler</legend>
        <p className="mt-1 text-xs text-zinc-600">
          Hiçbiri seçilmezse kampanya tüm hizmetlere uygulanır.
        </p>
        <div className="mt-2 grid gap-2">
          {(services.data ?? []).map((service) => (
            <label key={service.id} className="flex items-center gap-2 text-sm">
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
              />
              {service.name} ({service.price} {service.currency})
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        SMS şablonu (sonraki fazda gönderilir)
        <textarea
          aria-label="SMS şablonu"
          value={smsTemplate}
          onChange={(event) => setSmsTemplate(event.target.value)}
          rows={3}
          maxLength={1000}
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
