"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type {
  NotificationChannel,
  NotificationChannelSetup,
  NotificationRecord,
  NotificationSettings,
  UpsertNotificationChannelInput,
} from "@xenior/types";
import { PageFrame } from "@/components/ui/page-frame";
import { useToast } from "@/components/ui/toast";
import { AppError } from "@/lib/api/errors";
import {
  useNotificationLog,
  useNotificationSettings,
  useNotificationSetup,
  useTestNotificationChannel,
  useUpdateNotificationSettings,
  useUpsertNotificationChannel,
} from "@/lib/notifications/notification-queries";
import { useAuthStore } from "@/stores/auth-store";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-[15px] text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8] disabled:bg-[#e4f0f4]";
const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-[#3d7a8c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a] disabled:opacity-60";
const btnOutline =
  "inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5563] ring-1 ring-[#c5dde6] transition hover:bg-[#eef6f8] disabled:opacity-60";

const STATUS_LABELS: Record<NotificationRecord["status"], string> = {
  PENDING: "Bekliyor",
  SCHEDULED: "Zamanlandı",
  PROCESSING: "İşleniyor",
  SENT: "Gönderildi",
  FAILED: "Başarısız",
  CANCELLED: "İptal",
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  APPOINTMENT_CONFIRMED: "Randevu onayı",
  APPOINTMENT_REMINDER: "Randevu hatırlatması",
  APPOINTMENT_RESCHEDULED: "Randevu değişikliği",
  APPOINTMENT_CANCELLED: "Randevu iptali",
  SUBSCRIPTION: "Abonelik",
  CUSTOM: "Özel",
};

const NOTIFICATION_CHANNEL_LABELS: Record<string, string> = {
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  PUSH: "Mobil bildirim",
  EMAIL: "E-posta",
};

export default function NotificationSettingsPage() {
  const memberships = useAuthStore((state) => state.memberships);
  const selectedBusinessId = useAuthStore((state) => state.selectedBusinessId);
  const role = memberships.find(
    (item) => item.businessId === selectedBusinessId,
  )?.role;
  const readOnly = role === "STAFF";
  const settings = useNotificationSettings();
  const setup = useNotificationSetup(!readOnly);
  const log = useNotificationLog(!readOnly);

  if (settings.isLoading) {
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">Bildirim ayarları yükleniyor…</p>
      </PageFrame>
    );
  }
  if (!settings.data) {
    return (
      <PageFrame>
        <p role="alert" className="text-sm text-red-700">
          Bildirim ayarları yüklenemedi.
        </p>
      </PageFrame>
    );
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
          Bildirimler
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          Kanalları buradan kurun. SMS için NetGSM kullanılır. Kayıtlı şifreler
          tekrar gösterilmez.
        </p>
      </div>

      {readOnly ? null : (
        <ChannelSetupList items={setup.data ?? []} loading={setup.isLoading} />
      )}
      <SettingsForm
        key={settings.data.updatedAt}
        settings={settings.data}
        readOnly={readOnly}
      />
      {readOnly ? null : (
        <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
          <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
            <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
              Gönderim kaydı
            </h2>
            <p className="mt-0.5 text-[13px] text-[#5a7380]">
              Başarısız bildirimler ve hata kodları burada görünür.
            </p>
          </div>
          <div className="p-4 sm:p-5">
            {(log.data?.items ?? []).length ? (
              <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
                {(log.data?.items ?? []).map((item) => (
                  <li key={item.id} className="px-4 py-3.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[#1e3340]">
                        {NOTIFICATION_TYPE_LABELS[item.type] ?? item.type} ·{" "}
                        {NOTIFICATION_CHANNEL_LABELS[item.channel] ??
                          item.channel}
                      </p>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          item.status === "FAILED"
                            ? "bg-[#fff8eb] text-[#8a6a2f]"
                            : item.status === "SENT"
                              ? "bg-[#b8e6df]/45 text-[#2f5563]"
                              : "bg-[#e4f0f4] text-[#5a7380]"
                        }`}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-[#5a7380]">{item.body}</p>
                    {item.errorCode ? (
                      <p className="mt-2 text-[#8a6a2f]">
                        {item.errorCode}
                        {item.errorMessage ? `: ${item.errorMessage}` : ""}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#5a7380]">Henüz bildirim kaydı yok.</p>
            )}
          </div>
        </section>
      )}
    </PageFrame>
  );
}

function ChannelSetupList({
  items,
  loading,
}: {
  items: NotificationChannelSetup[];
  loading: boolean;
}) {
  const byChannel = new Map(items.map((item) => [item.channel, item]));
  return (
    <section className="mt-8 grid gap-4">
      <div>
        <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
          Kanal kurulumu
        </h2>
        <p className="mt-1 text-[13px] text-[#5a7380]">
          Güzellik merkezi kendi NetGSM, WhatsApp ve SMTP bilgilerini girer.
          Push Planio platform FCM ayarıyla gider.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-[#5a7380]">Kurulum durumu yükleniyor…</p>
      ) : (
        <>
          <NetGsmSetupCard setup={byChannel.get("SMS")} />
          <WhatsAppSetupCard setup={byChannel.get("WHATSAPP")} />
          <SmtpSetupCard setup={byChannel.get("EMAIL")} />
          <PushStatusCard setup={byChannel.get("PUSH")} />
        </>
      )}
    </section>
  );
}

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        configured
          ? "bg-[#b8e6df]/45 text-[#2f5563]"
          : "bg-[#e4f0f4] text-[#5a7380]"
      }`}
    >
      {configured ? "Hazır" : "Kurulmadı"}
    </span>
  );
}

function NetGsmSetupCard({ setup }: { setup?: NotificationChannelSetup }) {
  const [usercode, setUsercode] = useState("");
  const [password, setPassword] = useState("");
  const [msgheader, setMsgheader] = useState("");
  const [destination, setDestination] = useState("");
  return (
    <ChannelCard
      title="SMS · NetGSM"
      setup={setup}
      fields={
        <>
          <SetupField
            label="Kullanıcı kodu"
            value={usercode}
            onChange={setUsercode}
            autoComplete="username"
          />
          <SetupField
            label="Parola"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <SetupField
            label="Mesaj başlığı"
            value={msgheader}
            onChange={setMsgheader}
          />
        </>
      }
      destination={destination}
      onDestinationChange={setDestination}
      destinationLabel="Test telefonu"
      saveInput={{
        channel: "SMS",
        usercode,
        password,
        msgheader,
      }}
    />
  );
}

function WhatsAppSetupCard({ setup }: { setup?: NotificationChannelSetup }) {
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [destination, setDestination] = useState("");
  return (
    <ChannelCard
      title="WhatsApp Business"
      setup={setup}
      fields={
        <>
          <SetupField
            label="Erişim jetonu"
            type="password"
            value={accessToken}
            onChange={setAccessToken}
          />
          <SetupField
            label="Telefon numarası kimliği"
            value={phoneNumberId}
            onChange={setPhoneNumberId}
          />
          <SetupField
            label="Şablon adı (opsiyonel)"
            value={templateName}
            onChange={setTemplateName}
          />
        </>
      }
      destination={destination}
      onDestinationChange={setDestination}
      destinationLabel="Test WhatsApp numarası"
      saveInput={{
        channel: "WHATSAPP",
        accessToken,
        phoneNumberId,
        templateName: templateName || undefined,
      }}
    />
  );
}

function SmtpSetupCard({ setup }: { setup?: NotificationChannelSetup }) {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [destination, setDestination] = useState("");
  return (
    <ChannelCard
      title="E-posta · SMTP"
      setup={setup}
      fields={
        <>
          <SetupField label="SMTP sunucu" value={host} onChange={setHost} />
          <SetupField label="Port" value={port} onChange={setPort} />
          <SetupField
            label="Kullanıcı (opsiyonel)"
            value={username}
            onChange={setUsername}
          />
          <SetupField
            label="Parola (opsiyonel)"
            type="password"
            value={password}
            onChange={setPassword}
          />
          <SetupField
            label="Gönderen e-posta"
            type="email"
            value={fromEmail}
            onChange={setFromEmail}
          />
        </>
      }
      destination={destination}
      onDestinationChange={setDestination}
      destinationLabel="Test e-posta"
      saveInput={{
        channel: "EMAIL",
        host,
        port: Number(port) || 587,
        username: username || undefined,
        password: password || undefined,
        fromEmail,
      }}
    />
  );
}

function PushStatusCard({ setup }: { setup?: NotificationChannelSetup }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
      <div className="flex items-center justify-between gap-3 border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
        <h3 className="font-semibold text-[#2f5563]">Push · FCM</h3>
        <StatusBadge configured={Boolean(setup?.configured)} />
      </div>
      <p className="p-5 text-sm text-[#5a7380]">
        {setup?.hint ??
          "Push için işletme paneline token girilmez; Planio platform FCM ayarı kullanılır."}
      </p>
    </article>
  );
}

function ChannelCard({
  title,
  setup,
  fields,
  destination,
  onDestinationChange,
  destinationLabel,
  saveInput,
}: {
  title: string;
  setup?: NotificationChannelSetup;
  fields: ReactNode;
  destination: string;
  onDestinationChange: (value: string) => void;
  destinationLabel: string;
  saveInput: UpsertNotificationChannelInput;
}) {
  const save = useUpsertNotificationChannel();
  const test = useTestNotificationChannel();
  const { pushToast } = useToast();
  const [message, setMessage] = useState<string | null>(null);

  async function persist() {
    setMessage(null);
    try {
      await save.mutateAsync(saveInput);
      setMessage("Kanal kaydedildi.");
      pushToast("Kanal kaydedildi.");
    } catch (cause) {
      const text =
        cause instanceof AppError ? cause.message : "Kanal kaydedilemedi.";
      setMessage(text);
      pushToast(text, "error");
    }
  }

  async function sendTest() {
    setMessage(null);
    try {
      await test.mutateAsync({
        channel: saveInput.channel as NotificationChannel,
        destination,
      });
      setMessage("Test gönderildi.");
      pushToast("Test gönderildi.");
    } catch (cause) {
      const text =
        cause instanceof AppError ? cause.message : "Test gönderilemedi.";
      setMessage(text);
      pushToast(text, "error");
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
      <div className="flex items-center justify-between gap-3 border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
        <h3 className="font-semibold text-[#2f5563]">{title}</h3>
        <StatusBadge configured={Boolean(setup?.configured)} />
      </div>
      <div className="p-5">
        {setup?.hint ? (
          <p className="text-sm text-[#5a7380]">{setup.hint}</p>
        ) : null}
        {setup?.lastTestError ? (
          <p className="mt-2 text-sm text-[#8a6a2f]">{setup.lastTestError}</p>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{fields}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <SetupField
            label={destinationLabel}
            value={destination}
            onChange={onDestinationChange}
          />
          <button
            type="button"
            className={`${btnPrimary} self-end`}
            disabled={save.isPending}
            onClick={() => void persist()}
          >
            {save.isPending ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <button
            type="button"
            className={`${btnOutline} self-end`}
            disabled={test.isPending || !destination}
            onClick={() => void sendTest()}
          >
            {test.isPending ? "Gönderiliyor…" : "Test gönder"}
          </button>
        </div>
        {message ? (
          <p role="status" className="mt-3 text-sm text-[#5a7380]">
            {message}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function SetupField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
      {label}
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </label>
  );
}

function SettingsForm({
  settings,
  readOnly,
}: {
  settings: NotificationSettings;
  readOnly: boolean;
}) {
  const mutation = useUpdateNotificationSettings();
  const { pushToast } = useToast();
  const [smsEnabled, setSmsEnabled] = useState(settings.smsEnabled);
  const [whatsappEnabled, setWhatsappEnabled] = useState(settings.whatsappEnabled);
  const [emailEnabled, setEmailEnabled] = useState(settings.emailEnabled);
  const [pushEnabled, setPushEnabled] = useState(settings.pushEnabled);
  const [notifyOnCreated, setNotifyOnCreated] = useState(settings.notifyOnCreated);
  const [notifyOnRescheduled, setNotifyOnRescheduled] = useState(
    settings.notifyOnRescheduled,
  );
  const [notifyOnCancelled, setNotifyOnCancelled] = useState(
    settings.notifyOnCancelled,
  );
  const [reminderEnabled, setReminderEnabled] = useState(settings.reminderEnabled);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(
    String(settings.reminderMinutesBefore),
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      await mutation.mutateAsync({
        smsEnabled,
        whatsappEnabled,
        emailEnabled,
        pushEnabled,
        notifyOnCreated,
        notifyOnRescheduled,
        notifyOnCancelled,
        reminderEnabled,
        reminderMinutesBefore: Number(reminderMinutesBefore),
      });
      setMessage("Bildirim ayarları kaydedildi.");
      pushToast("Bildirim ayarları kaydedildi.");
    } catch (cause) {
      const text =
        cause instanceof AppError ? cause.message : "Ayarlar kaydedilemedi.";
      setMessage(text);
      pushToast(text, "error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70"
    >
      <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
        <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
          Bildirim tercihleri
        </h2>
      </div>
      <div className="grid gap-5 p-5">
        <fieldset className="grid gap-2">
          <legend className="text-[13px] font-semibold text-[#5a7380]">
            Kanallar
          </legend>
          {(
            [
              ["SMS", smsEnabled, setSmsEnabled],
              ["WhatsApp", whatsappEnabled, setWhatsappEnabled],
              ["E-posta", emailEnabled, setEmailEnabled],
              ["Push", pushEnabled, setPushEnabled],
            ] as const
          ).map(([label, checked, setter]) => (
            <label
              key={label}
              className="flex items-center gap-2 text-sm text-[#1e3340]"
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={readOnly}
                onChange={(event) => setter(event.target.checked)}
                className="accent-[#7eb8c8]"
              />
              {label}
            </label>
          ))}
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="text-[13px] font-semibold text-[#5a7380]">
            Randevu olayları
          </legend>
          {(
            [
              ["Oluşturma", notifyOnCreated, setNotifyOnCreated],
              ["Yeniden planlama", notifyOnRescheduled, setNotifyOnRescheduled],
              ["İptal", notifyOnCancelled, setNotifyOnCancelled],
              ["Hatırlatma", reminderEnabled, setReminderEnabled],
            ] as const
          ).map(([label, checked, setter]) => (
            <label
              key={label}
              className="flex items-center gap-2 text-sm text-[#1e3340]"
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={readOnly}
                onChange={(event) => setter(event.target.checked)}
                className="accent-[#7eb8c8]"
              />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
          Hatırlatma (dakika önce)
          <select
            aria-label="Hatırlatma süresi"
            value={reminderMinutesBefore}
            disabled={readOnly}
            onChange={(event) => setReminderMinutesBefore(event.target.value)}
            className={fieldClass}
          >
            <option value="30">30 dakika</option>
            <option value="60">1 saat</option>
            <option value="120">2 saat</option>
            <option value="1440">1 gün</option>
            <option value="2880">2 gün</option>
          </select>
        </label>
        {readOnly ? (
          <p className="text-sm text-[#5a7380]">
            Personel bildirim ayarlarını yalnızca görüntüleyebilir.
          </p>
        ) : (
          <button
            type="submit"
            disabled={mutation.isPending}
            className={btnPrimary}
          >
            {mutation.isPending ? "Kaydediliyor…" : "Ayarları kaydet"}
          </button>
        )}
        {message ? (
          <p role="status" className="text-sm text-[#5a7380]">
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
