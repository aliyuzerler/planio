"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CreditCard } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { AppError } from "@/lib/api/errors";
import { collectSale } from "@/lib/ledger/ledger-api";
import { useCanWriteCash, useSaleList } from "@/lib/ledger/ledger-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-[15px] text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

export default function PosPage() {
  const sales = useSaleList({ status: "OPEN" });
  const canWrite = useCanWriteCash();
  const queryClient = useQueryClient();
  const [saleId, setSaleId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const openSales = sales.data?.items ?? [];
  const selected = openSales.find((item) => item.id === saleId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) return;
    setError(null);
    setSaving(true);
    try {
      await collectSale(saleId, { amount, method: "CARD" });
      setAmount("");
      setMessage("POS tahsilatı kaydedildi.");
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({ queryKey: ["cash-accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : "POS tahsilatı alınamadı.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <div>
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          Finans
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          Manuel POS
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          Kart çekildikten sonra tahsilatı burada işaretleyin. Planio abonelik
          ödemesi buradan geçmez.
        </p>
      </div>

      {!canWrite ? (
        <p className="mt-6 rounded-xl bg-[#fff8eb] px-4 py-3 text-sm text-[#8a6a2f] ring-1 ring-[#f0e0b8]">
          POS tahsilatı yalnızca sahip ve muhasebe tarafından işaretlenir.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
            <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
              <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
                Tahsilat
              </h2>
            </div>
            <div className="grid gap-4 p-5">
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
                Açık satış / randevu
                <select
                  required
                  aria-label="Açık satış"
                  value={saleId}
                  onChange={(event) => {
                    setSaleId(event.target.value);
                    const next = openSales.find(
                      (item) => item.id === event.target.value,
                    );
                    setAmount(next?.remainingAmount ?? "");
                  }}
                  className={fieldClass}
                >
                  <option value="">Satış seçin</option>
                  {openSales.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.customer.firstName} {item.customer.lastName} · kalan{" "}
                      {item.remainingAmount} {item.currency}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
                Tutar
                <input
                  required
                  aria-label="POS tutarı"
                  value={amount}
                  placeholder={selected?.remainingAmount}
                  onChange={(event) => setAmount(event.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>
          </section>

          <button
            type="submit"
            disabled={saving || !saleId}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3d7a8c] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a] disabled:opacity-60"
          >
            <CreditCard className="h-4 w-4" />
            {saving ? "Kaydediliyor…" : "POS çekildi"}
          </button>
        </form>
      )}

      <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
        <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
            Açık satışlar
          </h2>
        </div>
        <div className="p-4 sm:p-5">
          {openSales.length ? (
            <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
              {openSales.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/settings/sales/${item.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-[#eef6f8]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[#1e3340]">
                        {item.customer.firstName} {item.customer.lastName}
                      </p>
                      <p className="mt-0.5 text-[13px] text-[#5a7380]">
                        Kalan {item.remainingAmount} {item.currency}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#7eb8c8]" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#5a7380]">Açık satış yok.</p>
          )}
        </div>
      </section>

      {message ? (
        <p className="mt-4 text-sm font-medium text-[#2f5563]">{message}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </PageFrame>
  );
}
