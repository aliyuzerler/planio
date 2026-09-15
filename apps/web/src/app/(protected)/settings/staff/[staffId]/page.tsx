"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@xenior/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageFrame } from "@/components/ui/page-frame";
import { useToast } from "@/components/ui/toast";
import { AppError } from "@/lib/api/errors";
import {
  assignSpecialization,
  getStaffHours,
  inviteStaff,
  unassignSpecialization,
  updateStaff,
  updateStaffHours,
} from "@/lib/staff/staff-api";
import { useCommissionEntries } from "@/lib/commissions/commission-queries";
import {
  useCanManageStaff,
  useSpecializations,
  useStaffDetail,
} from "@/lib/staff/staff-queries";
import type { StaffHoursSettings } from "@xenior/types";
import { useAuthStore } from "@/stores/auth-store";

export default function StaffDetailPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const queryClient = useQueryClient();
  const staff = useStaffDetail(staffId);
  const role = useAuthStore((state) =>
    state.memberships.find((item) => item.businessId === state.selectedBusinessId)
      ?.role,
  );
  const canSeeEarnings =
    role !== "STAFF" || Boolean(staff.data?.isSelf);
  const earnings = useCommissionEntries(staffId, canSeeEarnings);
  const specializations = useSpecializations(true);
  const canManage = useCanManageStaff();
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const { pushToast } = useToast();
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["staff"] });
  }

  async function toggleActive() {
    if (!staff.data) return;
    await runMutation(async () => {
      await updateStaff(staffId, { isActive: !staff.data!.isActive });
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });
  }

  async function assign() {
    if (!selectedSpecialization) return;
    await runMutation(async () => {
      await assignSpecialization(staffId, selectedSpecialization);
      setSelectedSpecialization("");
      await refresh();
    });
  }

  async function unassign(specializationId: string) {
    await runMutation(async () => {
      await unassignSpecialization(staffId, specializationId);
      await refresh();
    });
  }

  async function runMutation(operation: () => Promise<void>) {
    setMessage(null);
    setSaving(true);
    try {
      await operation();
      setMessage("Değişiklik kaydedildi.");
      pushToast("Değişiklik kaydedildi.");
    } catch (cause) {
      const text =
        cause instanceof AppError ? cause.message : "İşlem tamamlanamadı.";
      setMessage(text);
      pushToast(text, "error");
    } finally {
      setSaving(false);
      setConfirmToggle(false);
    }
  }

  if (staff.isLoading) return <PageMessage>Personel yükleniyor…</PageMessage>;
  if (staff.isError || !staff.data) {
    return <PageMessage>Personel bulunamadı.</PageMessage>;
  }

  const person = staff.data;
  const available = (specializations.data ?? []).filter(
    (item) =>
      item.isActive &&
      !person.specializations.some((assigned) => assigned.id === item.id),
  );

  return (
    <PageFrame width="sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {person.firstName} {person.lastName}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {person.isActive ? "Aktif personel" : "Pasif personel"}
          </p>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/settings/staff/${staffId}/edit`}>Düzenle</Link>
            </Button>
            <Button
              onClick={() =>
                void runMutation(async () => {
                  await inviteStaff(staffId);
                })
              }
              disabled={saving || !person.email}
              variant="outline"
            >
              E-posta ile davet et
            </Button>
            <Button
              onClick={() => setConfirmToggle(true)}
              disabled={saving}
              variant="outline"
            >
              {person.isActive ? "Pasifleştir" : "Aktifleştir"}
            </Button>
          </div>
        ) : null}
      </div>

      {!canManage ? (
        <p className="mt-6 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          STAFF rolü personel bilgilerini görüntüleyebilir ancak değiştiremez.
        </p>
      ) : null}

      <dl className="mt-6 grid gap-4 rounded-xl border border-zinc-200 p-6 sm:grid-cols-2">
        <Detail label="Telefon" value={person.phone} />
        <Detail label="E-posta" value={person.email} />
        <Detail label="Notlar" value={person.notes} wide />
      </dl>

      {canSeeEarnings ? (
        <section className="mt-6 rounded-xl border border-zinc-200 p-6">
          <h2 className="text-lg font-semibold">Hakediş</h2>
          {earnings.data?.items.length ? (
            <ul className="mt-3 grid gap-2 text-sm">
              {earnings.data.items.slice(0, 8).map((entry) => (
                <li key={entry.id}>
                  {entry.serviceNameSnapshot} · {entry.amount} {entry.currency} ·{" "}
                  {entry.ruleNameSnapshot}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">Henüz prim satırı yok.</p>
          )}
        </section>
      ) : null}

      <section className="mt-6 rounded-xl border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold">Uzmanlıklar</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {person.specializations.map((specialization) => (
            <span
              key={specialization.id}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-sm"
            >
              {specialization.name}
              {!specialization.isActive ? " (pasif)" : ""}
              {canManage ? (
                <button
                  type="button"
                  aria-label={`${specialization.name} uzmanlığını kaldır`}
                  onClick={() => unassign(specialization.id)}
                  disabled={saving}
                  className="font-bold"
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
          {person.specializations.length === 0 ? (
            <p className="text-sm text-zinc-600">Uzmanlık atanmamış.</p>
          ) : null}
        </div>
        {canManage && available.length > 0 ? (
          <div className="mt-4 flex gap-2">
            <select
              aria-label="Atanacak uzmanlık"
              value={selectedSpecialization}
              onChange={(event) => setSelectedSpecialization(event.target.value)}
              className="min-w-52 rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Uzmanlık seçin</option>
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={assign}
              disabled={!selectedSpecialization || saving}
            >
              Ata
            </Button>
          </div>
        ) : null}
        {canManage ? (
          <Link
            href="/settings/specializations"
            className="mt-4 inline-block text-sm underline"
          >
            Uzmanlık kataloğunu yönet
          </Link>
        ) : null}
      </section>

      <StaffHoursSection staffId={staffId} canManage={canManage} />
      {message ? (
        <p role="status" className="mt-4 text-sm text-zinc-700">
          {message}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirmToggle}
        title={person.isActive ? "Personeli pasifleştir" : "Personeli aktifleştir"}
        description="Durum değişikliği sunucuda kaydedilir."
        confirmLabel="Onayla"
        pending={saving}
        onCancel={() => setConfirmToggle(false)}
        onConfirm={() => void toggleActive()}
      />
    </PageFrame>
  );
}

function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs uppercase text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm">{value || "—"}</dd>
    </div>
  );
}

function PageMessage({ children }: { children: ReactNode }) {
  return (
    <PageFrame>
      <p className="text-sm text-zinc-600">{children}</p>
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

function StaffHoursSection({
  staffId,
  canManage,
}: {
  staffId: string;
  canManage: boolean;
}) {
  const [hours, setHours] = useState<StaffHoursSettings | null>(null);
  const [days, setDays] = useState<StaffHoursSettings["days"]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    void getStaffHours(staffId)
      .then((data) => {
        setHours(data);
        setDays(data.days);
      })
      .catch(() => {
        setMessage("Personel saatleri yüklenemedi.");
      });
  }, [staffId]);

  if (!hours) {
    return (
      <section className="mt-6 rounded-xl border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold">Çalışma saatleri</h2>
        <p className="mt-2 text-sm text-zinc-600">
          {message ?? "Saatler yükleniyor…"}
        </p>
      </section>
    );
  }

  return (
    <form
      className="mt-6 grid gap-4 rounded-xl border border-zinc-200 p-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canManage) return;
        setSaving(true);
        setMessage(null);
        void updateStaffHours(staffId, { days })
          .then((data) => {
            setHours(data);
            setDays(data.days);
            setMessage("Çalışma saatleri kaydedildi.");
            pushToast("Çalışma saatleri kaydedildi.");
          })
          .catch((cause) => {
            const text =
              cause instanceof AppError
                ? cause.message
                : "Saatler kaydedilemedi.";
            setMessage(text);
            pushToast(text, "error");
          })
          .finally(() => setSaving(false));
      }}
    >
      <div>
        <h2 className="text-lg font-semibold">Çalışma saatleri</h2>
        <p className="mt-1 text-sm text-zinc-600">
          İşletme saatleri zorunluysa randevu hem işletme hem bu saatlere uymalıdır.
        </p>
      </div>
      <div className="grid gap-3">
        {days.map((day, index) => (
          <div
            key={day.weekday}
            className="grid gap-2 sm:grid-cols-[7rem_1fr_1fr_auto] sm:items-center"
          >
            <p className="text-sm font-medium">{WEEKDAY_LABELS[day.weekday]}</p>
            <input
              type="time"
              aria-label={`${WEEKDAY_LABELS[day.weekday]} başlangıç`}
              disabled={!canManage || day.isClosed}
              value={minutesToTime(day.startMinutes)}
              onChange={(event) => {
                const next = [...days];
                next[index] = {
                  ...day,
                  startMinutes: timeToMinutes(event.target.value),
                };
                setDays(next);
              }}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
            />
            <input
              type="time"
              aria-label={`${WEEKDAY_LABELS[day.weekday]} bitiş`}
              disabled={!canManage || day.isClosed}
              value={minutesToTime(day.endMinutes)}
              onChange={(event) => {
                const next = [...days];
                next[index] = {
                  ...day,
                  endMinutes: timeToMinutes(event.target.value),
                };
                setDays(next);
              }}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={day.isClosed}
                disabled={!canManage}
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
      {canManage ? (
        <Button type="submit" disabled={saving}>
          {saving ? "Kaydediliyor…" : "Saatleri kaydet"}
        </Button>
      ) : null}
    </form>
  );
}
