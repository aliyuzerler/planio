"use client";

import { useState, type FormEvent } from "react";
import type {
  CreateStaffInput,
  SpecializationProfile,
  StaffProfile,
} from "@xenior/types";
import { createStaffInputSchema } from "@xenior/validation";
import { Button } from "@xenior/ui";
import { AppError } from "@/lib/api/errors";

export function StaffForm({
  initial,
  specializations,
  submitLabel,
  onSubmit,
}: {
  initial?: StaffProfile;
  specializations?: SpecializationProfile[];
  submitLabel: string;
  onSubmit: (input: CreateStaffInput) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [specializationIds, setSpecializationIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = createStaffInputSchema.safeParse({
      firstName,
      lastName,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      ...(specializations ? { specializationIds } : {}),
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
      <Field label="Ad" required value={firstName} onChange={setFirstName} />
      <Field label="Soyad" required value={lastName} onChange={setLastName} />
      <Field label="Telefon" type="tel" value={phone} onChange={setPhone} />
      <Field label="E-posta" type="email" value={email} onChange={setEmail} />
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Notlar
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          maxLength={5000}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      {specializations ? (
        <fieldset className="grid gap-2 sm:col-span-2">
          <legend className="mb-1 text-sm font-medium">Uzmanlıklar</legend>
          {specializations.filter((item) => item.isActive).map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={specializationIds.includes(item.id)}
                onChange={(event) =>
                  setSpecializationIds((current) =>
                    event.target.checked
                      ? [...current, item.id]
                      : current.filter((id) => id !== item.id),
                  )
                }
              />
              {item.name}
            </label>
          ))}
        </fieldset>
      ) : null}
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-zinc-300 px-3 py-2"
      />
    </label>
  );
}
