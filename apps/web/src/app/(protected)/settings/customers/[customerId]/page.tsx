"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@xenior/ui";
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

export default function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const queryClient = useQueryClient();
  const customer = useCustomerDetail(customerId);
  const history = useCustomerAppointments(customerId);
  const canManage = useCanManageCustomers();
  const canReadCash = useCanReadCash();
  const ledger = useLedgerEntries(customerId, canReadCash);
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
      await updateCustomer(customerId, { isActive: !customer.data.isActive });
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
    <PageFrame width="sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {person.firstName} {person.lastName}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {person.isActive ? "Aktif müşteri" : "Pasif müşteri"}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-800">
            Cari: {formatLedgerBalance(person.ledgerBalance)} TRY
          </p>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/settings/customers/${customerId}/edit`}>
                Düzenle
              </Link>
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
          {role === "ACCOUNTANT"
            ? "Muhasebe rolü müşteri kartını ve belgeleri görüntüleyebilir; düzenleyemez."
            : "STAFF rolü müşteri bilgilerini görüntüleyebilir ancak değiştiremez."}
        </p>
      ) : null}

      <dl className="mt-6 grid gap-4 rounded-xl border border-zinc-200 p-6 sm:grid-cols-2">
        <Detail label="Telefon" value={person.phone} />
        <Detail label="E-posta" value={person.email} />
        <Detail label="Doğum tarihi" value={person.birthDate} />
        <Detail label="Notlar" value={person.notes} wide />
      </dl>

      <section className="mt-6 rounded-xl border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold">Randevu geçmişi</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Yalnızca bu müşteriye ait gerçek randevular gösterilir.
        </p>
        {history.isLoading ? (
          <p className="mt-4 text-sm text-zinc-600">Geçmiş yükleniyor…</p>
        ) : null}
        {appointments?.items.length ? (
          <ul className="mt-4 grid gap-3">
            {appointments.items.map((appointment) => (
              <li
                key={appointment.id}
                className="rounded-lg border border-zinc-200 p-3 text-sm"
              >
                <p className="font-medium">{appointment.serviceNameSnapshot}</p>
                <p className="text-zinc-600">
                  {new Date(appointment.startAt).toLocaleString("tr-TR")} ·{" "}
                  {appointment.staff.firstName} {appointment.staff.lastName}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-zinc-600">
                    {appointment.servicePriceSnapshot} {appointment.currency}
                  </p>
                  <AppointmentStatusBadge status={appointment.status} />
                </div>
              </li>
            ))}
          </ul>
        ) : history.isSuccess ? (
          <p className="mt-4 text-sm text-zinc-600">
            Bu müşteri için henüz randevu kaydı yok.
          </p>
        ) : null}
      </section>

      {canReadCash ? (
        <section className="mt-6 rounded-xl border border-zinc-200 p-6">
          <h2 className="text-lg font-semibold">Cari hareketler</h2>
          {ledger.data?.items.length ? (
            <ul className="mt-3 grid gap-2 text-sm">
              {ledger.data.items.map((entry) => (
                <li key={entry.id}>
                  {entry.description} · {entry.amount} TRY · bakiye {entry.balanceAfter}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">Henüz cari hareket yok.</p>
          )}
        </section>
      ) : null}

      <CustomerFiles customerId={customerId} canManage={canManage} />
      {message ? (
        <p role="status" className="mt-4 text-sm text-zinc-700">
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

function formatLedgerBalance(value: string): string {
  const [whole = "0", fraction = "00"] = value.split(".");
  return `${whole},${fraction.padEnd(2, "0")}`;
}
