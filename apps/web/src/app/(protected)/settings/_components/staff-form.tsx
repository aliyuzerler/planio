"use client";

import { useState, type FormEvent } from "react";
import type {
  CreateStaffInput,
  SpecializationProfile,
  StaffLoginRole,
  StaffProfile,
} from "@xenior/types";
import { createStaffInputSchema } from "@xenior/validation";
import { AppError } from "@/lib/api/errors";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-[15px] text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

export function StaffForm({
  initial,
  specializations,
  submitLabel,
  onSubmit,
  allowRoleSelect = false,
}: {
  initial?: StaffProfile;
  specializations?: SpecializationProfile[];
  submitLabel: string;
  onSubmit: (input: CreateStaffInput) => Promise<void>;
  allowRoleSelect?: boolean;
}) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [loginRole, setLoginRole] = useState<StaffLoginRole>(
    initial?.loginRole ?? "STAFF",
  );
  const [specializationIds, setSpecializationIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showSpecializations =
    Boolean(specializations) && loginRole === "STAFF" && !initial;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = createStaffInputSchema.safeParse({
      firstName,
      lastName,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      loginRole: initial?.loginRole ?? loginRole,
      ...(showSpecializations ? { specializationIds } : {}),
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
            Kullanıcı bilgileri
          </h2>
          <p className="mt-0.5 text-[13px] text-[#5a7380]">
            Rol, iletişim ve isteğe bağlı notlar
          </p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {allowRoleSelect && !initial ? (
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380] sm:col-span-2">
              Panel rolü
              <select
                required
                value={loginRole}
                onChange={(event) =>
                  setLoginRole(event.target.value as StaffLoginRole)
                }
                className={fieldClass}
              >
                <option value="STAFF">Personel</option>
                <option value="ACCOUNTANT">Muhasebe</option>
              </select>
              <span className="text-[12px] font-normal text-[#5a7380]">
                Kayıt listede görünür; e-posta daveti detay sayfasından
                gönderilir.
              </span>
            </label>
          ) : null}
          <Field label="Ad" required value={firstName} onChange={setFirstName} />
          <Field label="Soyad" required value={lastName} onChange={setLastName} />
          <Field label="Telefon" type="tel" value={phone} onChange={setPhone} />
          <Field
            label="E-posta"
            type="email"
            required={loginRole === "ACCOUNTANT"}
            value={email}
            onChange={setEmail}
          />
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380] sm:col-span-2">
            Notlar
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              maxLength={5000}
              className={`${fieldClass} w-full resize-y`}
              placeholder="Opsiyonel notlar…"
            />
          </label>
          {showSpecializations && specializations ? (
            <fieldset className="rounded-xl bg-[#F7FBFC] p-4 ring-1 ring-[#e4f0f4] sm:col-span-2">
              <legend className="px-1 text-[13px] font-semibold text-[#5a7380]">
                Uzmanlıklar
              </legend>
              <div className="mt-2 grid gap-2">
                {specializations
                  .filter((item) => item.isActive)
                  .map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 text-sm text-[#1e3340]"
                    >
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
                        className="accent-[#7eb8c8]"
                      />
                      {item.name}
                    </label>
                  ))}
              </div>
            </fieldset>
          ) : null}
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
        className="inline-flex items-center justify-center rounded-xl bg-[#7eb8c8] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6aa9bb] disabled:opacity-60"
      >
        {submitting ? "Kaydediliyor…" : submitLabel}
      </button>
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
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
      {label}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </label>
  );
}
