"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, Pencil } from "lucide-react";
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

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-[15px] text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8] disabled:bg-[#e4f0f4] disabled:text-[#5a7380]";
const btnPrimary =
  "inline-flex items-center gap-2 rounded-xl bg-[#7eb8c8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6aa9bb] disabled:opacity-60";
const btnOutline =
  "inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5563] ring-1 ring-[#c5dde6] transition hover:bg-[#eef6f8] disabled:opacity-60";

export default function StaffDetailPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const queryClient = useQueryClient();
  const staff = useStaffDetail(staffId);
  const role = useAuthStore((state) =>
    state.memberships.find((item) => item.businessId === state.selectedBusinessId)
      ?.role,
  );
  const personLoginIsStaff = staff.data?.loginRole !== "ACCOUNTANT";
  const canSeeEarnings =
    personLoginIsStaff &&
    (role !== "STAFF" || Boolean(staff.data?.isSelf));
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
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <Link
        href="/settings/staff"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Personel listesine dön
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Kullanıcı kartı
          </p>
          <h1
            className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
            style={displayFont}
          >
            {person.firstName} {person.lastName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge active={person.isActive} />
            <RoleBadge role={person.loginRole} />
          </div>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Link href={`/settings/staff/${staffId}/edit`} className={btnOutline}>
              <Pencil className="h-4 w-4" />
              Düzenle
            </Link>
            <button
              type="button"
              className={btnOutline}
              onClick={() =>
                void runMutation(async () => {
                  await inviteStaff(staffId);
                })
              }
              disabled={saving || !person.email}
            >
              <Mail className="h-4 w-4" />
              E-posta ile davet et
            </button>
            <button
              type="button"
              className={btnPrimary}
              onClick={() => setConfirmToggle(true)}
              disabled={saving}
            >
              {person.isActive ? "Pasifleştir" : "Aktifleştir"}
            </button>
          </div>
        ) : null}
      </div>

      {!canManage ? (
        <p className="mt-6 rounded-xl bg-[#fff8eb] px-4 py-3 text-sm text-[#8a6a2f] ring-1 ring-[#f0e0b8]">
          STAFF rolü personel bilgilerini görüntüleyebilir ancak değiştiremez.
        </p>
      ) : null}

      <dl className="mt-6 grid gap-4 overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#c5dde6]/70 sm:grid-cols-2 sm:p-6">
        <Detail label="Telefon" value={person.phone} />
        <Detail label="E-posta" value={person.email} />
        <Detail label="Notlar" value={person.notes} wide />
      </dl>

      {canSeeEarnings ? (
        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
          <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
            <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
              Hakediş
            </h2>
          </div>
          <div className="p-5">
            {earnings.data?.items.length ? (
              <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
                {earnings.data.items.slice(0, 8).map((entry) => (
                  <li
                    key={entry.id}
                    className="px-4 py-3 text-sm text-[#1e3340]"
                  >
                    {entry.serviceNameSnapshot} · {entry.amount} {entry.currency} ·{" "}
                    {entry.ruleNameSnapshot}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#5a7380]">Henüz prim satırı yok.</p>
            )}
          </div>
        </section>
      ) : null}

      {person.loginRole === "STAFF" ? (
        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
          <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
            <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
              Uzmanlıklar
            </h2>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              {person.specializations.map((specialization) => (
                <span
                  key={specialization.id}
                  className="inline-flex items-center gap-2 rounded-full bg-[#eef6f8] px-3 py-1 text-sm font-medium text-[#2f5563]"
                >
                  {specialization.name}
                  {!specialization.isActive ? " (pasif)" : ""}
                  {canManage ? (
                    <button
                      type="button"
                      aria-label={`${specialization.name} uzmanlığını kaldır`}
                      onClick={() => unassign(specialization.id)}
                      disabled={saving}
                      className="font-bold text-[#5a7380] hover:text-[#2f5563]"
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              ))}
              {person.specializations.length === 0 ? (
                <p className="text-sm text-[#5a7380]">Uzmanlık atanmamış.</p>
              ) : null}
            </div>
            {canManage && available.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <select
                  aria-label="Atanacak uzmanlık"
                  value={selectedSpecialization}
                  onChange={(event) =>
                    setSelectedSpecialization(event.target.value)
                  }
                  className={`min-w-52 ${fieldClass}`}
                >
                  <option value="">Uzmanlık seçin</option>
                  {available.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={assign}
                  disabled={!selectedSpecialization || saving}
                  className={btnPrimary}
                >
                  Ata
                </button>
              </div>
            ) : null}
            {canManage ? (
              <Link
                href="/settings/specializations"
                className="mt-4 inline-block text-sm font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
              >
                Uzmanlık kataloğunu yönet
              </Link>
            ) : null}
          </div>
        </section>
      ) : (
        <p className="mt-6 rounded-2xl bg-[#eef6f8] px-5 py-4 text-sm text-[#5a7380] ring-1 ring-[#c5dde6]/70">
          Muhasebe kullanıcısı randevu uzmanlığı ve çalışma saati gerektirmez.
          Erişim için e-posta daveti gönderin; erişimi kesmek için pasifleştirin.
        </p>
      )}

      {person.loginRole === "STAFF" ? (
        <StaffHoursSection staffId={staffId} canManage={canManage} />
      ) : null}
      {message ? (
        <p role="status" className="mt-4 text-sm text-[#5a7380]">
          {message}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirmToggle}
        title={person.isActive ? "Kullanıcıyı pasifleştir" : "Kullanıcıyı aktifleştir"}
        description="Durum değişikliği sunucuda kaydedilir. Pasif üyelik panele giriş yapamaz."
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
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-[#1e3340]">{value || "—"}</dd>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active
          ? "bg-[#b8e6df]/45 text-[#2f5563]"
          : "bg-[#e4f0f4] text-[#5a7380]"
      }`}
    >
      {active ? "Aktif" : "Pasif"}
    </span>
  );
}

function RoleBadge({ role }: { role: "STAFF" | "ACCOUNTANT" }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        role === "ACCOUNTANT"
          ? "bg-[#e4f0f4] text-[#3d6b7a]"
          : "bg-[#b8e6df]/50 text-[#2f5563]"
      }`}
    >
      {role === "ACCOUNTANT" ? "Muhasebe" : "Personel"}
    </span>
  );
}

function PageMessage({ children }: { children: ReactNode }) {
  return (
    <PageFrame>
      <p className="text-sm text-[#5a7380]">{children}</p>
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
      <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
            Çalışma saatleri
          </h2>
        </div>
        <p className="p-5 text-sm text-[#5a7380]">
          {message ?? "Saatler yükleniyor…"}
        </p>
      </section>
    );
  }

  return (
    <form
      className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70"
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
      <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
        <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
          Çalışma saatleri
        </h2>
        <p className="mt-1 text-[13px] text-[#5a7380]">
          İşletme saatleri zorunluysa randevu hem işletme hem bu saatlere
          uymalıdır.
        </p>
      </div>
      <div className="grid gap-3 p-5">
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
              className={fieldClass}
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
              className={fieldClass}
            />
            <label className="flex items-center gap-2 text-sm text-[#1e3340]">
              <input
                type="checkbox"
                checked={day.isClosed}
                disabled={!canManage}
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
        <p role="status" className="px-5 pb-2 text-sm text-[#5a7380]">
          {message}
        </p>
      ) : null}
      {canManage ? (
        <div className="border-t border-[#e4f0f4] px-5 py-4">
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "Kaydediliyor…" : "Saatleri kaydet"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
