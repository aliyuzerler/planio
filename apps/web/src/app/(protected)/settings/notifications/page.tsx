"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type {
  NotificationChannel,
  NotificationChannelSetup,
  NotificationRecord,
  NotificationSettings,
  UpsertNotificationChannelInput,
} from "@xenior/types";
import { Button } from "@xenior/ui";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
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

const STATUS_LABELS: Record<NotificationRecord["status"], string> = {
  PENDING: "Bekliyor",
  SCHEDULED: "Zamanlandı",
  PROCESSING: "İşleniyor",
  SENT: "Gönderildi",
  FAILED: "Başarısız",
  CANCELLED: "İptal",
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
    return <PageFrame>Bildirim ayarları yükleniyor…</PageFrame>;
  }
  if (!settings.data) {
    return (
      <PageFrame>
        <p role="alert" className="text-sm">
          Bildirim ayarları yüklenemedi.
        </p>
      </PageFrame>
    );
  }

  return (
    <PageFrame width="sm">
      <PageHeader
        title="Bildirimler"
        description="Kanalları buradan kurun. SMS için NetGSM kullanılır. Kayıtlı şifreler tekrar gösterilmez."
      />
      {readOnly ? null : (
        <ChannelSetupList items={setup.data ?? []} loading={setup.isLoading} />
      )}
      <SettingsForm
        key={settings.data.updatedAt}
        settings={settings.data}
        readOnly={readOnly}
      />
      {readOnly ? null : (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Gönderim kaydı</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Başarısız bildirimler ve hata kodları burada görünür.
          </p>
          <div className="mt-4 grid gap-3">
            {(log.data?.items ?? []).map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-zinc-200 p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {item.type} · {item.channel}
                  </p>
                  <span
                    className={
                      item.status === "FAILED"
                        ? "text-amber-800"
                        : item.status === "SENT"
                          ? "text-emerald-800"
                          : "text-zinc-600"
                    }
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
                <p className="mt-1 text-zinc-600">{item.body}</p>
                {item.errorCode ? (
                  <p className="mt-2 text-amber-800">
                    {item.errorCode}
                    {item.errorMessage ? `: ${item.errorMessage}` : ""}
                  </p>
                ) : null}
              </article>
            ))}
            {log.data?.items.length === 0 ? (
              <p className="text-sm text-zinc-600">Henüz bildirim kaydı yok.</p>
            ) : null}
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
    <section className="mt-6 grid gap-4">
      <div>
        <h2 className="text-lg font-semibold">Kanal kurulumu</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Güzellik merkezi kendi NetGSM, WhatsApp ve SMTP bilgilerini girer.
          Push Planio platform FCM ayarıyla gider.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-zinc-600">Kurulum durumu yükleniyor…</p>
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
      className={
        configured
          ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
          : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600"
      }
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
    <article className="rounded-xl border border-zinc-200 p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">Push · FCM</h3>
        <StatusBadge configured={Boolean(setup?.configured)} />
      </div>
      <p className="mt-2 text-sm text-zinc-600">
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
    <article className="rounded-xl border border-zinc-200 p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">{title}</h3>
        <StatusBadge configured={Boolean(setup?.configured)} />
      </div>
      {setup?.hint ? (
        <p className="mt-2 text-sm text-zinc-600">{setup.hint}</p>
      ) : null}
      {setup?.lastTestError ? (
        <p className="mt-2 text-sm text-amber-800">{setup.lastTestError}</p>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{fields}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <SetupField
          label={destinationLabel}
          value={destination}
          onChange={onDestinationChange}
        />
        <Button
          type="button"
          className="self-end"
          disabled={save.isPending}
          onClick={() => void persist()}
        >
          {save.isPending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="self-end"
          disabled={test.isPending || !destination}
          onClick={() => void sendTest()}
        >
          {test.isPending ? "Gönderiliyor…" : "Test gönder"}
        </Button>
      </div>
      {message ? (
        <p role="status" className="mt-3 text-sm text-zinc-700">
          {message}
        </p>
      ) : null}
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
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-zinc-300 px-3 py-2"
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
      className="mt-6 grid gap-4 rounded-xl border border-zinc-200 p-6"
    >
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Kanallar</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={smsEnabled}
            disabled={readOnly}
            onChange={(event) => setSmsEnabled(event.target.checked)}
          />
          SMS
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={whatsappEnabled}
            disabled={readOnly}
            onChange={(event) => setWhatsappEnabled(event.target.checked)}
          />
          WhatsApp
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={emailEnabled}
            disabled={readOnly}
            onChange={(event) => setEmailEnabled(event.target.checked)}
          />
          E-posta
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pushEnabled}
            disabled={readOnly}
            onChange={(event) => setPushEnabled(event.target.checked)}
          />
          Push
        </label>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Randevu olayları</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={notifyOnCreated}
            disabled={readOnly}
            onChange={(event) => setNotifyOnCreated(event.target.checked)}
          />
          Oluşturma
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={notifyOnRescheduled}
            disabled={readOnly}
            onChange={(event) => setNotifyOnRescheduled(event.target.checked)}
          />
          Yeniden planlama
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={notifyOnCancelled}
            disabled={readOnly}
            onChange={(event) => setNotifyOnCancelled(event.target.checked)}
          />
          İptal
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={reminderEnabled}
            disabled={readOnly}
            onChange={(event) => setReminderEnabled(event.target.checked)}
          />
          Hatırlatma
        </label>
      </fieldset>
      <label className="flex flex-col gap-1 text-sm">
        Hatırlatma (dakika önce)
        <select
          aria-label="Hatırlatma süresi"
          value={reminderMinutesBefore}
          disabled={readOnly}
          onChange={(event) => setReminderMinutesBefore(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        >
          <option value="30">30 dakika</option>
          <option value="60">1 saat</option>
          <option value="120">2 saat</option>
          <option value="1440">1 gün</option>
          <option value="2880">2 gün</option>
        </select>
      </label>
      {readOnly ? (
        <p className="text-sm text-zinc-600">
          Personel bildirim ayarlarını yalnızca görüntüleyebilir.
        </p>
      ) : (
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Kaydediliyor…" : "Ayarları kaydet"}
        </Button>
      )}
      {message ? (
        <p role="status" className="text-sm text-zinc-700">
          {message}
        </p>
      ) : null}
    </form>
  );
}
