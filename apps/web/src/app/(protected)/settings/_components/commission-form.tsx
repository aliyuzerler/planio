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
import { AppError } from "@/lib/api/errors";
import { useServiceList } from "@/lib/services/service-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-[15px] text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

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
    <form onSubmit={handleSubmit} className="grid gap-5">
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
            Kural bilgileri
          </h2>
          <p className="mt-0.5 text-[13px] text-[#5a7380]">
            Prim türü, değer ve hedef hizmet
          </p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380] sm:col-span-2">
            Kural adı
            <input
              required
              aria-label="Kural adı"
              maxLength={160}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
            Prim türü
            <select
              aria-label="Prim türü"
              value={commissionType}
              onChange={(event) =>
                setCommissionType(event.target.value as CommissionType)
              }
              className={fieldClass}
            >
              <option value="PERCENT">Yüzde</option>
              <option value="AMOUNT">Tutar</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
            Prim değeri
            <input
              required
              aria-label="Prim değeri"
              value={commissionValue}
              onChange={(event) => setCommissionValue(event.target.value)}
              placeholder={commissionType === "PERCENT" ? "20.00" : "50.00"}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380] sm:col-span-2">
            Hizmet
            <select
              aria-label="Hedef hizmet"
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              className={fieldClass}
            >
              <option value="">Tüm hizmetler</option>
              {(services.data ?? []).map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.price} {service.currency})
                </option>
              ))}
            </select>
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
