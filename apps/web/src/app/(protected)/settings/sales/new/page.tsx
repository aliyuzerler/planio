"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@xenior/ui";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { AppError } from "@/lib/api/errors";
import { useCustomerList } from "@/lib/customers/customer-queries";
import { createCounterSale } from "@/lib/ledger/ledger-api";
import { useCanWriteCash } from "@/lib/ledger/ledger-queries";
import { useServiceList } from "@/lib/services/service-queries";
import { useStaffList } from "@/lib/staff/staff-queries";

export default function NewSalePage() {
  const router = useRouter();
  const canWrite = useCanWriteCash();
  const customers = useCustomerList({ isActive: true });
  const services = useServiceList({ isActive: true });
  const staff = useStaffList({ isActive: true });
  const [customerId, setCustomerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!canWrite) router.replace("/settings/sales");
  }, [canWrite, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const sale = await createCounterSale({
        customerId,
        serviceId,
        staffId: staffId || null,
        notes: notes || null,
      });
      router.replace(`/settings/sales/${sale.id}`);
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : "Satış oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canWrite) return null;
  return (
    <PageFrame width="sm">
      <PageHeader
        title="Tezgah satışı"
        description="Randevusuz hizmet satışı. Kampanya fiyatı varsa uygulanır."
      />
      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 rounded-xl border border-zinc-200 p-6">
        <label className="flex flex-col gap-1 text-sm">
          Müşteri
          <select
            required
            aria-label="Müşteri"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          >
            <option value="">Seçin</option>
            {(customers.data?.items ?? []).map((person) => (
              <option key={person.id} value={person.id}>
                {person.firstName} {person.lastName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Hizmet
          <select
            required
            aria-label="Hizmet"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          >
            <option value="">Seçin</option>
            {(services.data ?? []).map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ({service.price} {service.currency})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Personel
          <select
            aria-label="Personel"
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          >
            <option value="">Yok</option>
            {(staff.data ?? []).map((person) => (
              <option key={person.id} value={person.id}>
                {person.firstName} {person.lastName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Not
          <textarea
            aria-label="Satış notu"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Kaydediliyor…" : "Satış oluştur"}
        </Button>
      </form>
    </PageFrame>
  );
}
