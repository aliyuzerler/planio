"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { BusinessProfile } from "@xenior/types";
import { Button } from "@xenior/ui";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { updateBusinessInputSchema } from "@xenior/validation";
import { AppError } from "@/lib/api/errors";
import {
  exportBusinessData,
  requestBusinessErase,
} from "@/lib/business/business-api";
import {
  useBusinessHours,
  useBusinessProfile,
  useUpdateBusinessHours,
  useUpdateBusinessProfile,
} from "@/lib/business/business-queries";
import { useAuthStore } from "@/stores/auth-store";

export default function BusinessSettingsPage() {
  const router = useRouter();
  const selectedBusinessId = useAuthStore(
    (state) => state.selectedBusinessId,
  );
  const query = useBusinessProfile();

  useEffect(() => {
    if (!selectedBusinessId) {
      router.replace("/select-business");
    }
  }, [router, selectedBusinessId]);

  if (!selectedBusinessId || query.isLoading) {
    return <PageMessage>İşletme bilgileri yükleniyor…</PageMessage>;
  }

  if (query.isError || !query.data) {
    return (
      <PageMessage role="alert">
        İşletme bilgileri yüklenemedi. Lütfen tekrar deneyin.
      </PageMessage>
    );
  }

  return (
    <BusinessForm
      key={query.data.id}
      business={query.data}
    />
  );
}

function BusinessForm({ business }: { business: BusinessProfile }) {
  const memberships = useAuthStore((state) => state.memberships).filter(
    (membership) =>
      membership.isActive && membership.businessStatus === "ACTIVE",
  );
  const selectedBusinessId = useAuthStore(
    (state) => state.selectedBusinessId,
  );
  const selectBusiness = useAuthStore((state) => state.selectBusiness);
  const activeMembership = memberships.find(
    (membership) => membership.businessId === selectedBusinessId,
  );
  const mutation = useUpdateBusinessProfile();
  const { pushToast } = useToast();
  const [name, setName] = useState(business.name);
  const [phone, setPhone] = useState(business.phone ?? "");
  const [email, setEmail] = useState(business.email ?? "");
  const [address, setAddress] = useState(business.address ?? "");
  const [timezone, setTimezone] = useState(business.timezone);
  const [currency, setCurrency] = useState(business.currency);
  const [message, setMessage] = useState<string | null>(null);
  const readOnly = activeMembership?.role === "STAFF";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const result = updateBusinessInputSchema.safeParse({
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
      timezone,
      currency,
    });
    if (!result.success) {
      setMessage(result.error.issues[0]?.message ?? "Bilgileri kontrol edin.");
      return;
    }

    try {
      await mutation.mutateAsync(result.data);
      setMessage("İşletme bilgileri kaydedildi.");
      pushToast("İşletme bilgileri kaydedildi.");
    } catch (cause) {
      const text =
        cause instanceof AppError
          ? cause.message
          : "İşletme bilgileri kaydedilemedi.";
      setMessage(text);
      pushToast(text, "error");
    }
  }

  return (
    <PageFrame width="sm">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="İşletme ayarları"
          description="Profil ve yerel işletme tercihlerini yönetin."
        />
        {memberships.length > 1 ? (
          <label className="flex flex-col gap-1 text-sm">
            Aktif işletme
            <select
              value={selectedBusinessId ?? ""}
              onChange={(event) => selectBusiness(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            >
              {memberships.map((membership) => (
                <option
                  key={membership.businessId}
                  value={membership.businessId}
                >
                  {membership.businessName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-xl border border-zinc-200 p-6 sm:grid-cols-2"
      >
        {readOnly ? (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">
            STAFF rolü işletme profilini görüntüleyebilir ancak değiştiremez.
          </p>
        ) : null}
        <Field label="İşletme adı" required value={name} onChange={setName} disabled={readOnly} />
        <Field label="Telefon" type="tel" value={phone} onChange={setPhone} disabled={readOnly} />
        <Field label="E-posta" type="email" value={email} onChange={setEmail} disabled={readOnly} />
        <Field label="Saat dilimi" required value={timezone} onChange={setTimezone} disabled={readOnly} />
        <Field label="Para birimi" required maxLength={3} value={currency} onChange={(value) => setCurrency(value.toUpperCase())} disabled={readOnly} />
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Adres
          <textarea
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            disabled={readOnly}
            maxLength={5000}
            rows={4}
            className="rounded-md border border-zinc-300 px-3 py-2 disabled:bg-zinc-100"
          />
        </label>
        {message ? (
          <p role="status" className="text-sm text-zinc-700 sm:col-span-2">
            {message}
          </p>
        ) : null}
        {!readOnly ? (
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="sm:col-span-2"
          >
            {mutation.isPending ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
          </Button>
        ) : null}
      </form>
      <HoursSection readOnly={readOnly} />
      {readOnly ? null : <PrivacySection />}
    </PageFrame>
  );
}

const WEEKDAY_LABELS = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function HoursSection({ readOnly }: { readOnly: boolean }) {
  const hours = useBusinessHours();
  const mutation = useUpdateBusinessHours();
  const { pushToast } = useToast();
  const [message, setMessage] = useState<string | null>(null);

  if (hours.isLoading) {
    return <p className="mt-8 text-sm text-zinc-600">Çalışma saatleri yükleniyor…</p>;
  }
  if (!hours.data) {
    return (
      <p role="alert" className="mt-8 text-sm">
        Çalışma saatleri yüklenemedi.
      </p>
    );
  }

  return (
    <HoursForm
      key={`${hours.data.hoursEnforced}-${hours.data.days.map((day) => `${day.weekday}:${day.startMinutes}:${day.endMinutes}:${day.isClosed}`).join("|")}`}
      initial={hours.data}
      readOnly={readOnly}
      pending={mutation.isPending}
      message={message}
      onSubmit={async (input) => {
        setMessage(null);
        try {
          await mutation.mutateAsync(input);
          setMessage("Çalışma saatleri kaydedildi.");
          pushToast("Çalışma saatleri kaydedildi.");
        } catch (cause) {
          const text =
            cause instanceof AppError
              ? cause.message
              : "Çalışma saatleri kaydedilemedi.";
          setMessage(text);
          pushToast(text, "error");
        }
      }}
    />
  );
}

function HoursForm({
  initial,
  readOnly,
  pending,
  message,
  onSubmit,
}: {
  initial: import("@xenior/types").BusinessHoursSettings;
  readOnly: boolean;
  pending: boolean;
  message: string | null;
  onSubmit: (input: import("@xenior/types").UpdateBusinessHoursInput) => Promise<void>;
}) {
  const [hoursEnforced, setHoursEnforced] = useState(initial.hoursEnforced);
  const [days, setDays] = useState(initial.days);

  return (
    <form
      className="mt-8 grid gap-4 rounded-xl border border-zinc-200 p-6"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({ hoursEnforced, days });
      }}
    >
      <div>
        <h2 className="text-lg font-semibold">Çalışma saatleri</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Açıldığında randevular yalnızca bu saatlere alınır.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={hoursEnforced}
          disabled={readOnly}
          onChange={(event) => setHoursEnforced(event.target.checked)}
        />
        Çalışma saatlerini randevularda zorunlu tut
      </label>
      <div className="grid gap-3">
        {days.map((day, index) => (
          <div key={day.weekday} className="grid gap-2 sm:grid-cols-[7rem_1fr_1fr_auto] sm:items-center">
            <p className="text-sm font-medium">{WEEKDAY_LABELS[day.weekday]}</p>
            <input
              type="time"
              aria-label={`${WEEKDAY_LABELS[day.weekday]} başlangıç`}
              disabled={readOnly || day.isClosed}
              value={minutesToTime(day.startMinutes)}
              onChange={(event) => {
                const next = [...days];
                next[index] = { ...day, startMinutes: timeToMinutes(event.target.value) };
                setDays(next);
              }}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
            />
            <input
              type="time"
              aria-label={`${WEEKDAY_LABELS[day.weekday]} bitiş`}
              disabled={readOnly || day.isClosed}
              value={minutesToTime(day.endMinutes)}
              onChange={(event) => {
                const next = [...days];
                next[index] = { ...day, endMinutes: timeToMinutes(event.target.value) };
                setDays(next);
              }}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={day.isClosed}
                disabled={readOnly}
                onChange={(event) => {
                  const next = [...days];
                  next[index] = { ...day, isClosed: event.target.checked };
                  setDays(next);
                }}
              />
              Kapalı
            </label>
          </div>
        ))}
      </div>
      {message ? <p role="status" className="text-sm text-zinc-700">{message}</p> : null}
      {readOnly ? null : (
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Saatleri kaydet"}
        </Button>
      )}
    </form>
  );
}

function PrivacySection() {
  const { pushToast } = useToast();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function exportData() {
    setPending(true);
    setMessage(null);
    try {
      const data = await exportBusinessData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "planio-kvkk-export.json";
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Veri dışa aktarıldı.");
      pushToast("Veri dışa aktarıldı.");
    } catch (cause) {
      const text =
        cause instanceof AppError ? cause.message : "Dışa aktarma başarısız.";
      setMessage(text);
      pushToast(text, "error");
    } finally {
      setPending(false);
    }
  }

  async function requestErase() {
    setPending(true);
    setMessage(null);
    try {
      await requestBusinessErase();
      setMessage(
        "Silme kuyruğa alındı. Müşteri kimlik bilgileri anonimleştirildi; satış ve randevu kayıtları korunur.",
      );
      pushToast("Silme kuyruğa alındı ve işlendi.");
    } catch (cause) {
      const text =
        cause instanceof AppError ? cause.message : "Silme talebi gönderilemedi.";
      setMessage(text);
      pushToast(text, "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-8 grid gap-4 rounded-xl border border-zinc-200 p-6">
      <div>
        <h2 className="text-lg font-semibold">KVKK</h2>
        <p className="mt-1 text-sm text-zinc-600">
          İşletme verilerini dışa aktarın veya silme talebi oluşturun.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={pending} onClick={() => void exportData()}>
          Verileri dışa aktar
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => void requestErase()}>
          Silme talebi
        </Button>
      </div>
      {message ? <p role="status" className="text-sm text-zinc-700">{message}</p> : null}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type={type}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-zinc-300 px-3 py-2 disabled:bg-zinc-100"
      />
    </label>
  );
}

function PageMessage({
  children,
  role,
}: {
  children: ReactNode;
  role?: "alert";
}) {
  return (
    <PageFrame>
      <p role={role} className="text-sm text-zinc-600">
        {children}
      </p>
    </PageFrame>
  );
}
