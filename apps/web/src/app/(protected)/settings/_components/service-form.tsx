"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { CreateServiceInput, ServiceProfile } from "@xenior/types";
import {
  createServiceInputSchema,
  normalizeServicePrice,
} from "@xenior/validation";
import { AppError } from "@/lib/api/errors";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-[15px] text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

export function ServiceForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: ServiceProfile;
  submitLabel: string;
  onSubmit: (input: CreateServiceInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [duration, setDuration] = useState(
    initial ? String(initial.durationMinutes) : "",
  );
  const [price, setPrice] = useState(initial?.price ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const normalizedPrice = normalizeServicePrice(price);
    const durationMinutes = /^\d+$/.test(duration) ? Number(duration) : NaN;
    const parsed = createServiceInputSchema.safeParse({
      name,
      description: description || null,
      durationMinutes,
      price: normalizedPrice,
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
            Hizmet bilgileri
          </h2>
          <p className="mt-0.5 text-[13px] text-[#5a7380]">
            Ad, süre, fiyat ve isteğe bağlı açıklama
          </p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Hizmet adı" className="sm:col-span-2">
            <input
              required
              maxLength={160}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Süre (dakika)">
            <input
              required
              inputMode="numeric"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Fiyat">
            <input
              required
              inputMode="decimal"
              placeholder="0.00"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Açıklama" className="sm:col-span-2">
            <textarea
              maxLength={5000}
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={`${fieldClass} w-full resize-y`}
              placeholder="Opsiyonel açıklama…"
            />
          </Field>
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
    <label
      className={`flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380] ${className}`}
    >
      {label}
      {children}
    </label>
  );
}
