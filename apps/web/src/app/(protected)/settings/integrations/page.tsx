"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TenantPosProvider, UyumsoftProvider } from "@xenior/types";
import { Button } from "@xenior/ui";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
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
    <PageFrame width="sm">
      <PageHeader
        title="Entegrasyonlar"
        description="İşletme sanal POS ve Uyumsoft bilgileri Bildirimler’den ayrı tutulur; Planio abonelik iyzico anahtarlarıyla karışmaz."
      />
      {settings.isLoading ? (
        <p className="mt-4 text-sm">Ayarlar yükleniyor…</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 grid gap-3 rounded-xl border border-zinc-200 p-6">
          <h2 className="text-lg font-semibold">Sanal POS</h2>
          <p className="text-sm text-zinc-600">
            {current?.hasCredentials
              ? "Kayıtlı kimlik bilgileri var; yeni değer yazmazsanız mevcut şifreli kayıt korunur."
              : "Henüz kimlik bilgisi yok. Generic sağlayıcı ödeme linkini sandbox olarak tamamlar."}
          </p>
          <label className="flex flex-col gap-1 text-sm">
            Sağlayıcı
            <select
              aria-label="POS sağlayıcı"
              value={provider}
              onChange={(event) => setProvider(event.target.value as TenantPosProvider)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            >
              <option value="GENERIC">Generic / sandbox</option>
              <option value="IYZICO">iyzico (işletme)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Aktif
          </label>
          <label className="flex flex-col gap-1 text-sm">
            API anahtarı
            <input
              aria-label="API anahtarı"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Gizli anahtar
            <input
              type="password"
              aria-label="Gizli anahtar"
              value={secretKey}
              onChange={(event) => setSecretKey(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <Button type="submit" disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </form>
      )}
      {uyumsoft.isLoading ? (
        <p className="mt-4 text-sm">Uyumsoft yükleniyor…</p>
      ) : (
        <form onSubmit={handleUyumsoft} className="mt-6 grid gap-3 rounded-xl border border-zinc-200 p-6">
          <h2 className="text-lg font-semibold">Uyumsoft e-Fatura / SMM</h2>
          <p className="text-sm text-zinc-600">
            {currentUyumsoft?.hasCredentials
              ? "Kayıtlı Uyumsoft kimliği var; boş bırakırsanız şifreli kayıt korunur."
              : "Generic / sandbox, dahili fiş kesilmiş satıştan SMM veya e-Fatura numarası üretir. Canlı Uyumsoft için kullanıcı adı ve parola gerekir."}
          </p>
          <label className="flex flex-col gap-1 text-sm">
            Sağlayıcı
            <select
              aria-label="Uyumsoft sağlayıcı"
              value={uyumsoftProvider}
              onChange={(event) =>
                setUyumsoftProvider(event.target.value as UyumsoftProvider)
              }
              className="rounded-md border border-zinc-300 px-3 py-2"
            >
              <option value="GENERIC">Generic / sandbox</option>
              <option value="UYUMSOFT">Uyumsoft</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={uyumsoftActive}
              onChange={(event) => setUyumsoftActive(event.target.checked)}
            />
            Aktif
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Kullanıcı adı
            <input
              aria-label="Uyumsoft kullanıcı adı"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Parola
            <input
              type="password"
              aria-label="Uyumsoft parola"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <Button type="submit" disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </form>
      )}
      {message ? <p className="mt-4 text-sm text-emerald-800">{message}</p> : null}
      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </PageFrame>
  );
}
