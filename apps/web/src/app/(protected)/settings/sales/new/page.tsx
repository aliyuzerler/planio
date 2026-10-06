"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { useToast } from "@/components/ui/toast";
import { AppError } from "@/lib/api/errors";
import { useCustomerList } from "@/lib/customers/customer-queries";
import { createCounterSale } from "@/lib/ledger/ledger-api";
import { useCanWriteCash } from "@/lib/ledger/ledger-queries";
import { useServiceList } from "@/lib/services/service-queries";
import { useStaffList } from "@/lib/staff/staff-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-[15px] text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

export default function NewSalePage() {
  const router = useRouter();
  const canWrite = useCanWriteCash();
  const { pushToast } = useToast();
  const customers = useCustomerList({ isActive: true });
  const services = useServiceList({ isActive: true });
  const staff = useStaffList({ isActive: true, loginRole: "STAFF" });
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
      pushToast("Satış oluşturuldu.");
      router.replace(`/settings/sales/${sale.id}`);
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : "Satış oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canWrite) return null;
  return (
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />
      <Link
        href="/settings/sales"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Satış listesine dön
      </Link>
      <div className="mt-4">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          Yeni kayıt
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          Tezgah satışı
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          Randevusuz hizmet satışı. Kampanya fiyatı varsa uygulanır.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
          <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
            <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
              Satış bilgileri
            </h2>
          </div>
          <div className="grid gap-4 p-5">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Müşteri
              <select
                required
                aria-label="Müşteri"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                className={fieldClass}
              >
                <option value="">Seçin</option>
                {(customers.data?.items ?? []).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.firstName} {person.lastName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Hizmet
              <select
                required
                aria-label="Hizmet"
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                className={fieldClass}
              >
                <option value="">Seçin</option>
                {(services.data ?? []).map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.price} {service.currency})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Personel
              <select
                aria-label="Personel"
                value={staffId}
                onChange={(event) => setStaffId(event.target.value)}
                className={fieldClass}
              >
                <option value="">Yok</option>
                {(staff.data ?? []).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.firstName} {person.lastName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Not
              <textarea
                aria-label="Satış notu"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className={`${fieldClass} w-full resize-y`}
              />
            </label>
          </div>
        </section>

        {error ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-xl bg-[#3d7a8c] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a] disabled:opacity-60"
        >
          {submitting ? "Kaydediliyor…" : "Satış oluştur"}
        </button>
      </form>
    </PageFrame>
  );
}
