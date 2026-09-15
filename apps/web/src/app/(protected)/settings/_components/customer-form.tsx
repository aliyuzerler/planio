"use client";

import { useState, type FormEvent } from "react";
import type { CreateCustomerInput, CustomerProfile } from "@xenior/types";
import { createCustomerInputSchema } from "@xenior/validation";
import { Button } from "@xenior/ui";
import { AppError } from "@/lib/api/errors";

export function CustomerForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: CustomerProfile;
  submitLabel: string;
  onSubmit: (input: CreateCustomerInput) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [smsConsent, setSmsConsent] = useState(initial?.smsConsent ?? true);
  const [whatsappConsent, setWhatsappConsent] = useState(
    initial?.whatsappConsent ?? true,
  );
  const [emailConsent, setEmailConsent] = useState(initial?.emailConsent ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = createCustomerInputSchema.safeParse({
      firstName,
      lastName,
      phone: phone || null,
      email: email || null,
      birthDate: birthDate || null,
      notes: notes || null,
      smsConsent,
      whatsappConsent,
      emailConsent,
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
      <Field
        label="Doğum tarihi"
        type="date"
        value={birthDate}
        onChange={setBirthDate}
      />
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
      <fieldset className="grid gap-2 sm:col-span-2">
        <legend className="text-sm font-medium">Bildirim rızası</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={smsConsent}
            onChange={(event) => setSmsConsent(event.target.checked)}
          />
          SMS
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={whatsappConsent}
            onChange={(event) => setWhatsappConsent(event.target.checked)}
          />
          WhatsApp
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={emailConsent}
            onChange={(event) => setEmailConsent(event.target.checked)}
          />
          E-posta
        </label>
      </fieldset>
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
