"use client";

import { useState, type FormEvent } from "react";
import type { CreateServiceInput, ServiceProfile } from "@xenior/types";
import {
  createServiceInputSchema,
  normalizeServicePrice,
} from "@xenior/validation";
import { Button } from "@xenior/ui";
import { AppError } from "@/lib/api/errors";

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
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-xl border border-zinc-200 p-6 sm:grid-cols-2"
    >
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Hizmet adı
        <input
          required
          maxLength={160}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Süre (dakika)
        <input
          required
          inputMode="numeric"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Fiyat
        <input
          required
          inputMode="decimal"
          placeholder="0.00"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Açıklama
        <textarea
          maxLength={5000}
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
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
