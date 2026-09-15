"use client";

import { useState, type FormEvent } from "react";
import type {
  CommissionRuleRecord,
  CommissionType,
  CreateCommissionRuleInput,
} from "@xenior/types";
import {
  createCommissionRuleInputSchema,
  normalizeServicePrice,
} from "@xenior/validation";
import { Button } from "@xenior/ui";
import { AppError } from "@/lib/api/errors";
import { useServiceList } from "@/lib/services/service-queries";

export function CommissionForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: CommissionRuleRecord;
  submitLabel: string;
  onSubmit: (input: CreateCommissionRuleInput) => Promise<void>;
}) {
  const services = useServiceList({ isActive: true });
  const [name, setName] = useState(initial?.name ?? "");
  const [commissionType, setCommissionType] = useState<CommissionType>(
    initial?.commissionType ?? "PERCENT",
  );
  const [commissionValue, setCommissionValue] = useState(
    initial?.commissionValue ?? "",
  );
  const [serviceId, setServiceId] = useState(initial?.serviceId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = createCommissionRuleInputSchema.safeParse({
      name,
      commissionType,
      commissionValue: normalizeServicePrice(commissionValue),
      serviceId: serviceId || null,
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
        Kural adı
        <input
          required
          aria-label="Kural adı"
          maxLength={160}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Prim türü
        <select
          aria-label="Prim türü"
          value={commissionType}
          onChange={(event) =>
            setCommissionType(event.target.value as CommissionType)
          }
          className="rounded-md border border-zinc-300 px-3 py-2"
        >
          <option value="PERCENT">Yüzde</option>
          <option value="AMOUNT">Tutar</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Prim değeri
        <input
          required
          aria-label="Prim değeri"
          value={commissionValue}
          onChange={(event) => setCommissionValue(event.target.value)}
          placeholder={commissionType === "PERCENT" ? "20.00" : "50.00"}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Hizmet
        <select
          aria-label="Hedef hizmet"
          value={serviceId}
          onChange={(event) => setServiceId(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        >
          <option value="">Tüm hizmetler</option>
          {(services.data ?? []).map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} ({service.price} {service.currency})
            </option>
          ))}
        </select>
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
