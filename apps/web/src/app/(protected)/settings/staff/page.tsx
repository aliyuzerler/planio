"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@xenior/ui";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { QueryState } from "@/components/ui/query-state";
import { useToast } from "@/components/ui/toast";
import { AppError } from "@/lib/api/errors";
import { inviteAccountant } from "@/lib/business/business-api";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { useCanManageStaff, useStaffList } from "@/lib/staff/staff-queries";

export default function StaffListPage() {
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const canManage = useCanManageStaff();
  const staff = useStaffList({
    q: q.trim() || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "true",
  });

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Personel"
        description="İşletme personelini görüntüleyin ve yönetin."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/settings/staff/new">Yeni personel</Link>
            </Button>
          ) : null
        }
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          aria-label="Personel ara"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Ad, telefon veya e-posta ara"
          className="min-w-64 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <select
          aria-label="Durum filtresi"
          value={activeFilter}
          onChange={(event) =>
            setActiveFilter(event.target.value as typeof activeFilter)
          }
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="all">Tümü</option>
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>
      </div>

      <QueryState
        isLoading={staff.isLoading}
        isError={staff.isError}
        isEmpty={staff.data?.length === 0}
        loading="Personel yükleniyor…"
        error="Personel bilgileri yüklenemedi."
        empty="Henüz personel bulunmuyor."
      >
        {staff.data ? (
          <DataTable caption="Personel listesi">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Ad</DataTableHeaderCell>
                <DataTableHeaderCell>İletişim</DataTableHeaderCell>
                <DataTableHeaderCell>Uzmanlıklar</DataTableHeaderCell>
                <DataTableHeaderCell>Durum</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {staff.data.map((person) => (
                <DataTableRow key={person.id}>
                  <DataTableCell>
                    <Link
                      href={`/settings/staff/${person.id}`}
                      className="font-medium underline"
                    >
                      {person.firstName} {person.lastName}
                    </Link>
                  </DataTableCell>
                  <DataTableCell className="text-zinc-600">
                    {person.phone ?? person.email ?? "İletişim bilgisi yok"}
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-wrap gap-1">
                      {person.specializations.map((specialization) => (
                        <span
                          key={specialization.id}
                          className="rounded-full bg-zinc-100 px-2 py-1 text-xs"
                        >
                          {specialization.name}
                        </span>
                      ))}
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <Status active={person.isActive} />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}
      </QueryState>
      {canManage ? <AccountantInviteCard /> : null}
    </PageFrame>
  );
}

function Status({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs ${
        active ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-700"
      }`}
    >
      {active ? "Aktif" : "Pasif"}
    </span>
  );
}

function AccountantInviteCard() {
  const { pushToast } = useToast();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await inviteAccountant({ email, firstName, lastName });
      setEmail("");
      setFirstName("");
      setLastName("");
      setMessage("Muhasebe daveti gönderildi.");
      pushToast("Muhasebe daveti gönderildi.");
    } catch (cause) {
      const text =
        cause instanceof AppError ? cause.message : "Davet gönderilemedi.";
      setMessage(text);
      pushToast(text, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="mt-8 grid gap-4 rounded-xl border border-zinc-200 p-6"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <div>
        <h2 className="text-lg font-semibold">Muhasebe kullanıcısı davet et</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Bu hesapla giriş yapan kişi yalnızca muhasebe ekranlarını görür.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Ad
          <input
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Soyad
          <input
            required
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          E-posta
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>
      {message ? <p role="status" className="text-sm text-zinc-700">{message}</p> : null}
      <Button type="submit" disabled={saving}>
        {saving ? "Gönderiliyor…" : "Muhasebe daveti gönder"}
      </Button>
    </form>
  );
}
