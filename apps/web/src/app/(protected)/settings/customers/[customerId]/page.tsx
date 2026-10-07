"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Wallet } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageFrame } from "@/components/ui/page-frame";
import { useToast } from "@/components/ui/toast";
import { AppError } from "@/lib/api/errors";
import { updateCustomer } from "@/lib/customers/customer-api";
import { AppointmentStatusBadge } from "@/app/(protected)/settings/_components/appointment-status-badge";
import {
  useCanManageCustomers,
  useCustomerAppointments,
  useCustomerDetail,
} from "@/lib/customers/customer-queries";
import { useAuthStore } from "@/stores/auth-store";
import { CustomerFiles } from "@/app/(protected)/settings/_components/customer-files";
import { useCanReadCash, useLedgerEntries } from "@/lib/ledger/ledger-queries";
import { formatMoney, formatTry } from "@/lib/money";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

export default function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const queryClient = useQueryClient();
  const customer = useCustomerDetail(customerId);
  const history = useCustomerAppointments(customerId);
  const canManage = useCanManageCustomers();
  const canReadCash = useCanReadCash();
  const ledger = useLedgerEntries(customerId, canReadCash);
  const ledgerEntries = ledger.data?.pages.flatMap((page) => page.items) ?? [];
  const role = useAuthStore((state) =>
    state.memberships.find((item) => item.businessId === state.selectedBusinessId)
      ?.role,
  );
  const { pushToast } = useToast();
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);

  async function toggleActive() {
    if (!customer.data) return;
    setMessage(null);
    setSaving(true);
    try {
      const updated = await updateCustomer(customerId, {
        isActive: !customer.data.isActive,
      });
      const businessId = useAuthStore.getState().selectedBusinessId;
      queryClient.setQueryData(
        ["customers", businessId, customerId],
        updated,
      );
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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

  if (customer.isLoading) return <PageMessage>Müşteri yükleniyor…</PageMessage>;
  if (customer.isError || !customer.data) {
    return <PageMessage>Müşteri bulunamadı.</PageMessage>;
  }

  const person = customer.data;
  const appointments = history.data;

  return (
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <Link
        href="/settings/customers"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Müşteri listesine dön
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Müşteri kartı
          </p>
          <h1
            className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
            style={displayFont}
          >
            {person.firstName} {person.lastName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge active={person.isActive} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef6f8] px-2.5 py-0.5 text-[12px] font-semibold text-[#3d6b7a]">
              <Wallet className="h-3.5 w-3.5" />
              Cari: {formatTry(person.ledgerBalance)}
            </span>
          </div>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/settings/customers/${customerId}/edit`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5563] shadow-sm ring-1 ring-[#c5dde6]/80 transition hover:bg-[#eef6f8]"
            >
              <Pencil className="h-4 w-4" />
              Düzenle
            </Link>
            <button
              type="button"
              onClick={() => setConfirmToggle(true)}
              disabled={saving}
              className="inline-flex items-center rounded-xl bg-[#3d7a8c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a] disabled:opacity-60"
            >
              {person.isActive ? "Pasifleştir" : "Aktifleştir"}
            </button>
          </div>
        ) : null}
      </div>

      {!canManage ? (
        <p className="mt-6 rounded-xl bg-[#eef6f8] px-4 py-3 text-sm leading-6 text-[#3d6b7a] ring-1 ring-[#c5dde6]/70">
          {role === "ACCOUNTANT"
            ? "Muhasebe rolü müşteri kartını ve belgeleri görüntüleyebilir; düzenleyemez."
            : "Personel rolü müşteri bilgilerini görüntüleyebilir ancak değiştiremez."}
        </p>
      ) : null}

      <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
            İletişim ve notlar
          </h2>
        </div>
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <Detail label="Telefon" value={person.phone} />
          <Detail label="E-posta" value={person.email} />
          <Detail label="Doğum tarihi" value={person.birthDate} />
          <Detail label="Notlar" value={person.notes} wide />
        </dl>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
            Randevu geçmişi
          </h2>
          <p className="mt-0.5 text-[13px] text-[#5a7380]">
            Yalnızca bu müşteriye ait gerçek randevular gösterilir.
          </p>
        </div>
        <div className="px-2 py-2 sm:px-3">
          {history.isLoading ? (
            <p className="px-3 py-6 text-sm text-[#5a7380]">Geçmiş yükleniyor…</p>
          ) : null}
          {appointments?.items.length ? (
            <ul className="divide-y divide-[#e4f0f4]">
              {appointments.items.map((appointment) => (
                <li key={appointment.id}>
                  <Link
                    href={`/settings/appointments/${appointment.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-[#eef6f8]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[#1e3340]">
                        {appointment.serviceNameSnapshot}
                      </p>
                      <p className="mt-0.5 text-[13px] text-[#5a7380]">
                        {new Date(appointment.startAt).toLocaleString("tr-TR")} ·{" "}
                        {appointment.staff.firstName} {appointment.staff.lastName}
                      </p>
                      <p className="mt-1 text-[12px] font-semibold text-[#3d6b7a]">
                        {formatMoney(appointment.servicePriceSnapshot, appointment.currency)}
                      </p>
                    </div>
                    <AppointmentStatusBadge status={appointment.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : history.isSuccess ? (
            <p className="px-3 py-6 text-sm text-[#5a7380]">
              Bu müşteri için henüz randevu kaydı yok.
            </p>
          ) : null}
        </div>
      </section>

      {canReadCash ? (
        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
          <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
            <h2
              className="text-lg font-semibold text-[#2f5563]"
              style={displayFont}
            >
              Cari hareketler
            </h2>
          </div>
          <div className="px-2 py-2 sm:px-3">
            {ledgerEntries.length ? (
              <ul className="divide-y divide-[#e4f0f4]">
                {ledgerEntries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-[13px]"
                  >
                    <span className="font-medium text-[#1e3340]">
                      {entry.description}
                    </span>
                    <span className="font-semibold text-[#3d6b7a]">
                      {formatTry(entry.amount)} · bakiye {formatTry(entry.balanceAfter)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-6 text-sm text-[#5a7380]">
                Henüz cari hareket yok.
              </p>
            )}
          </div>
        </section>
      ) : null}

      <div className="mt-6">
        <CustomerFiles customerId={customerId} canManage={canManage} />
      </div>

      {message ? (
        <p role="status" className="mt-4 text-sm font-medium text-[#3d6b7a]">
          {message}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirmToggle}
        title={person.isActive ? "Müşteriyi pasifleştir" : "Müşteriyi aktifleştir"}
        description="Durum değişikliği sunucuda kaydedilir."
        confirmLabel="Onayla"
        pending={saving}
        onCancel={() => setConfirmToggle(false)}
        onConfirm={() => void toggleActive()}
      />
    </PageFrame>
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
      {active ? "Aktif müşteri" : "Pasif müşteri"}
    </span>
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
    <div
      className={`rounded-xl bg-[#F7FBFC] px-4 py-3 ring-1 ring-[#e4f0f4] ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#7eb8c8]">
        {label}
      </dt>
      <dd className="mt-1 text-[15px] font-medium text-[#1e3340]">
        {value || "—"}
      </dd>
    </div>
  );
}

function PageMessage({ children }: { children: ReactNode }) {
  return (
    <PageFrame>
      <p className="text-sm text-[#5a7380]">{children}</p>
    </PageFrame>
  );
}
