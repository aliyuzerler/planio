"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TenantPosProvider, UyumsoftProvider } from "@xenior/types";
import { PageFrame } from "@/components/ui/page-frame";
import { AppError } from "@/lib/api/errors";
import {
  getTenantPaymentSettings,
  upsertTenantPaymentSettings,
} from "@/lib/checkout/checkout-api";
import {
  getTenantUyumsoftSettings,
  upsertTenantUyumsoftSettings,
} from "@/lib/invoicing/invoicing-api";
import { useAuthStore } from "@/stores/auth-store";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-[15px] text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";
const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-[#3d7a8c] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a] disabled:opacity-60";

export default function IntegrationsPage() {
  const role = useAuthStore((state) =>
    state.memberships.find((item) => item.businessId === state.selectedBusinessId)
      ?.role,
  );
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  const settings = useQuery({
    queryKey: ["tenant-payments", businessId],
    queryFn: getTenantPaymentSettings,
    enabled: Boolean(businessId) && role === "BUSINESS_OWNER",
  });
  const uyumsoft = useQuery({
    queryKey: ["tenant-uyumsoft", businessId],
    queryFn: getTenantUyumsoftSettings,
    enabled: Boolean(businessId) && role === "BUSINESS_OWNER",
  });
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<TenantPosProvider>("GENERIC");
  const [isActive, setIsActive] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [uyumsoftProvider, setUyumsoftProvider] = useState<UyumsoftProvider>("GENERIC");
  const [uyumsoftActive, setUyumsoftActive] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const current = settings.data;
  const currentUyumsoft = uyumsoft.data;
  const [posSource, setPosSource] = useState(current);
  const [uyumsoftSource, setUyumsoftSource] = useState(currentUyumsoft);

  if (current !== posSource) {
    setPosSource(current);
    if (current) {
      setProvider(current.provider);
      setIsActive(current.isActive);
    }
  }

  if (currentUyumsoft !== uyumsoftSource) {
    setUyumsoftSource(currentUyumsoft);
    if (currentUyumsoft) {
      setUyumsoftProvider(currentUyumsoft.provider);
      setUyumsoftActive(currentUyumsoft.isActive);
    }
  }

  if (role !== "BUSINESS_OWNER") {
    return (
      <PageFrame>
        <p role="alert" className="text-sm text-red-700">
          Entegrasyon anahtarları yalnızca işletme sahibi tarafından yönetilir.
        </p>
      </PageFrame>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await upsertTenantPaymentSettings({
        provider,
        isActive,
        apiKey: apiKey || undefined,
        secretKey: secretKey || undefined,
      });
      setApiKey("");
      setSecretKey("");
      setMessage("Sanal POS ayarları kaydedildi.");
      await queryClient.invalidateQueries({ queryKey: ["tenant-payments"] });
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : "Ayarlar kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUyumsoft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await upsertTenantUyumsoftSettings({
        provider: uyumsoftProvider,
        isActive: uyumsoftActive,
        username: username || undefined,
        password: password || undefined,
      });
      setUsername("");
      setPassword("");
      setMessage("Uyumsoft ayarları kaydedildi.");
      await queryClient.invalidateQueries({ queryKey: ["tenant-uyumsoft"] });
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : "Ayarlar kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <div>
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          Ayarlar
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          Entegrasyonlar
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          İşletme sanal POS ve Uyumsoft bilgileri Bildirimler’den ayrı tutulur;
          Planio abonelik iyzico anahtarlarıyla karışmaz.
        </p>
      </div>

      {settings.isLoading ? (
        <p className="mt-8 text-sm text-[#5a7380]">Ayarlar yükleniyor…</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
            <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
              <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
                Sanal POS
              </h2>
              <p className="mt-0.5 text-[13px] text-[#5a7380]">
                {current?.hasCredentials
                  ? "Kayıtlı kimlik bilgileri var; yeni değer yazmazsanız mevcut şifreli kayıt korunur."
                  : "Henüz kimlik bilgisi yok. Generic sağlayıcı ödeme linkini sandbox olarak tamamlar."}
              </p>
            </div>
            <div className="grid gap-4 p-5">
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
                Sağlayıcı
                <select
                  aria-label="POS sağlayıcı"
                  value={provider}
                  onChange={(event) =>
                    setProvider(event.target.value as TenantPosProvider)
                  }
                  className={fieldClass}
                >
                  <option value="GENERIC">Generic / sandbox</option>
                  <option value="IYZICO">iyzico (işletme)</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-[#1e3340]">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="accent-[#7eb8c8]"
                />
                Aktif
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
                API anahtarı
                <input
                  aria-label="API anahtarı"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
                Gizli anahtar
                <input
                  type="password"
                  aria-label="Gizli anahtar"
                  value={secretKey}
                  onChange={(event) => setSecretKey(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </section>
        </form>
      )}

      {uyumsoft.isLoading ? (
        <p className="mt-6 text-sm text-[#5a7380]">Uyumsoft yükleniyor…</p>
      ) : (
        <form onSubmit={handleUyumsoft} className="mt-6 grid gap-5">
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
            <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
              <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
                Uyumsoft e-Fatura / SMM
              </h2>
              <p className="mt-0.5 text-[13px] text-[#5a7380]">
                {currentUyumsoft?.hasCredentials
                  ? "Kayıtlı Uyumsoft kimliği var; boş bırakırsanız şifreli kayıt korunur."
                  : "Generic / sandbox, dahili fiş kesilmiş satıştan SMM veya e-Fatura numarası üretir. Canlı Uyumsoft için kullanıcı adı ve parola gerekir."}
              </p>
            </div>
            <div className="grid gap-4 p-5">
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
                Sağlayıcı
                <select
                  aria-label="Uyumsoft sağlayıcı"
                  value={uyumsoftProvider}
                  onChange={(event) =>
                    setUyumsoftProvider(event.target.value as UyumsoftProvider)
                  }
                  className={fieldClass}
                >
                  <option value="GENERIC">Generic / sandbox</option>
                  <option value="UYUMSOFT">Uyumsoft</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-[#1e3340]">
                <input
                  type="checkbox"
                  checked={uyumsoftActive}
                  onChange={(event) => setUyumsoftActive(event.target.checked)}
                  className="accent-[#7eb8c8]"
                />
                Aktif
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
                Kullanıcı adı
                <input
                  aria-label="Uyumsoft kullanıcı adı"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
                Parola
                <input
                  type="password"
                  aria-label="Uyumsoft parola"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </section>
        </form>
      )}

      {message ? (
        <p className="mt-4 text-sm font-medium text-[#2f5563]">{message}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </PageFrame>
  );
}
