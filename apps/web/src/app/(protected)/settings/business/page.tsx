"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { BusinessProfile } from "@xenior/types";
import { PageFrame } from "@/components/ui/page-frame";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-[15px] text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8] disabled:bg-[#e4f0f4] disabled:text-[#5a7380]";
const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-[#7eb8c8] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6aa9bb] disabled:opacity-60";
const btnOutline =
  "inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5563] ring-1 ring-[#c5dde6] transition hover:bg-[#eef6f8] disabled:opacity-60";

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

  return <BusinessForm key={query.data.id} business={query.data} />;
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
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Ayarlar
          </p>
          <h1
            className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
            style={displayFont}
          >
            İşletme
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
            Profil ve yerel işletme tercihlerini yönetin.
          </p>
        </div>
        {memberships.length > 1 ? (
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
            Aktif işletme
            <select
              value={selectedBusinessId ?? ""}
              onChange={(event) => selectBusiness(event.target.value)}
              className={fieldClass}
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

      <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
          <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
            <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
              Profil
            </h2>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {readOnly ? (
              <p className="rounded-xl bg-[#fff8eb] px-4 py-3 text-sm text-[#8a6a2f] ring-1 ring-[#f0e0b8] sm:col-span-2">
                STAFF rolü işletme profilini görüntüleyebilir ancak değiştiremez.
              </p>
            ) : null}
            <Field label="İşletme adı" required value={name} onChange={setName} disabled={readOnly} />
            <Field label="Telefon" type="tel" value={phone} onChange={setPhone} disabled={readOnly} />
            <Field label="E-posta" type="email" value={email} onChange={setEmail} disabled={readOnly} />
            <Field label="Saat dilimi" required value={timezone} onChange={setTimezone} disabled={readOnly} />
            <Field
              label="Para birimi"
              required
              maxLength={3}
              value={currency}
              onChange={(value) => setCurrency(value.toUpperCase())}
              disabled={readOnly}
            />
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380] sm:col-span-2">
              Adres
              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                disabled={readOnly}
                maxLength={5000}
                rows={4}
                className={`${fieldClass} w-full resize-y`}
              />
            </label>
          </div>
        </section>

        {message ? (
          <p role="status" className="text-sm text-[#5a7380]">
            {message}
          </p>
        ) : null}

        {!readOnly ? (
          <button type="submit" disabled={mutation.isPending} className={btnPrimary}>
            {mutation.isPending ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
          </button>
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
    return (
      <p className="mt-8 text-sm text-[#5a7380]">Çalışma saatleri yükleniyor…</p>
    );
  }
  if (!hours.data) {
    return (
      <p role="alert" className="mt-8 text-sm text-red-700">
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
      className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({ hoursEnforced, days });
      }}
    >
      <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
        <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
          Çalışma saatleri
        </h2>
        <p className="mt-1 text-[13px] text-[#5a7380]">
          Açıldığında randevular yalnızca bu saatlere alınır.
        </p>
      </div>
      <div className="grid gap-4 p-5">
        <label className="flex items-center gap-2 text-sm text-[#1e3340]">
          <input
            type="checkbox"
            checked={hoursEnforced}
            disabled={readOnly}
            onChange={(event) => setHoursEnforced(event.target.checked)}
            className="accent-[#7eb8c8]"
          />
          Çalışma saatlerini randevularda zorunlu tut
        </label>
        <div className="grid gap-3">
          {days.map((day, index) => (
            <div
              key={day.weekday}
              className="grid gap-2 sm:grid-cols-[7rem_1fr_1fr_auto] sm:items-center"
            >
              <p className="text-sm font-semibold text-[#2f5563]">
                {WEEKDAY_LABELS[day.weekday]}
              </p>
              <input
                type="time"
                aria-label={`${WEEKDAY_LABELS[day.weekday]} başlangıç`}
                disabled={readOnly || day.isClosed}
                value={minutesToTime(day.startMinutes)}
                onChange={(event) => {
                  const next = [...days];
                  next[index] = {
                    ...day,
                    startMinutes: timeToMinutes(event.target.value),
                  };
                  setDays(next);
                }}
                className={fieldClass}
              />
              <input
                type="time"
                aria-label={`${WEEKDAY_LABELS[day.weekday]} bitiş`}
                disabled={readOnly || day.isClosed}
                value={minutesToTime(day.endMinutes)}
                onChange={(event) => {
                  const next = [...days];
                  next[index] = {
                    ...day,
                    endMinutes: timeToMinutes(event.target.value),
                  };
                  setDays(next);
                }}
                className={fieldClass}
              />
              <label className="flex items-center gap-2 text-sm text-[#1e3340]">
                <input
                  type="checkbox"
                  checked={day.isClosed}
                  disabled={readOnly}
                  onChange={(event) => {
                    const next = [...days];
                    next[index] = { ...day, isClosed: event.target.checked };
                    setDays(next);
                  }}
                  className="accent-[#7eb8c8]"
                />
                Kapalı
              </label>
            </div>
          ))}
        </div>
        {message ? (
          <p role="status" className="text-sm text-[#5a7380]">
            {message}
          </p>
        ) : null}
        {readOnly ? null : (
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? "Kaydediliyor…" : "Saatleri kaydet"}
          </button>
        )}
      </div>
    </form>
  );
}

function PrivacySection() {
  const { pushToast } = useToast();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);

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
      link.download = `planio-kvkk-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage(
        "Veriler JSON dosyası olarak indirildi. Bu dosya KVKK kapsamında yedek/aktarım için kullanılabilir.",
      );
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
        "Silme talebi işlendi. Müşteri kimlik bilgileri anonimleştirildi; satış, randevu ve mali kayıtlar yasal saklama için korunur.",
      );
      pushToast("Silme talebi tamamlandı.");
    } catch (cause) {
      const text =
        cause instanceof AppError ? cause.message : "Silme talebi gönderilemedi.";
      setMessage(text);
      pushToast(text, "error");
    } finally {
      setPending(false);
      setConfirmErase(false);
    }
  }

  return (
    <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
      <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
        <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
          KVKK
        </h2>
        <p className="mt-1 text-[13px] text-[#5a7380]">
          Veri dışa aktarma ve silme talepleri KVKK yükümlülükleri içindir.
        </p>
      </div>
      <div className="grid gap-4 p-5">
        <div className="rounded-xl bg-[#F7FBFC] px-4 py-3 ring-1 ring-[#e4f0f4]">
          <p className="text-[13px] font-semibold text-[#2f5563]">
            Verileri dışa aktar
          </p>
          <p className="mt-1 text-[13px] leading-5 text-[#5a7380]">
            İşletme, müşteri, randevu ve satış verilerini yapılandırılmış{" "}
            <span className="font-semibold">JSON</span> dosyası olarak indirir.
            Dosya bilgisayarınıza kaydedilir; sunucuda ayrı bir kopya
            oluşturulmaz.
          </p>
          <button
            type="button"
            className={`${btnOutline} mt-3`}
            disabled={pending}
            onClick={() => void exportData()}
          >
            JSON olarak indir
          </button>
        </div>

        <div className="rounded-xl bg-[#fff8eb] px-4 py-3 ring-1 ring-[#f0e0b8]">
          <p className="text-[13px] font-semibold text-[#8a6a2f]">
            Silme talebi
          </p>
          <p className="mt-1 text-[13px] leading-5 text-[#8a6a2f]">
            Bu işlem geri alınamaz. Müşteri ad, telefon ve e-posta gibi kimlik
            bilgileri anonimleştirilir. Satış, randevu ve mali kayıtlar yasal
            saklama için kalır; ancak kişisel bilgiler okunamaz hale gelir.
          </p>
          <button
            type="button"
            className={`${btnOutline} mt-3`}
            disabled={pending}
            onClick={() => setConfirmErase(true)}
          >
            Silme talebi oluştur
          </button>
        </div>
      </div>
      {message ? (
        <p role="status" className="px-5 pb-5 text-sm text-[#5a7380]">
          {message}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirmErase}
        title="Silme talebini onaylayın"
        description={
          <div className="grid gap-2">
            <p>
              Devam ederseniz müşteri kimlik bilgileri anonimleştirilir. Bu işlem
              geri alınamaz.
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Ad, soyad, telefon, e-posta gibi alanlar silinir / anonimleştirilir.</li>
              <li>Satış, randevu ve kasa kayıtları yasal saklama için korunur.</li>
              <li>İşlem denetim kaydına yazılır.</li>
            </ul>
          </div>
        }
        acknowledgeLabel="Anladım: kimlik bilgileri anonimleştirilecek ve bu işlem geri alınamaz."
        confirmLabel="Silme talebini onayla"
        pending={pending}
        onCancel={() => setConfirmErase(false)}
        onConfirm={() => void requestErase()}
      />
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
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
      {label}
      <input
        type={type}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
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
      <p role={role} className="text-sm text-[#5a7380]">
        {children}
      </p>
    </PageFrame>
  );
}
