"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@xenior/ui";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { AppError } from "@/lib/api/errors";
import { collectSale } from "@/lib/ledger/ledger-api";
import { useCanWriteCash, useSaleList } from "@/lib/ledger/ledger-queries";

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
    <PageFrame width="sm">
      <PageHeader
        title="Manuel POS"
        description="Kart çekildikten sonra tahsilatı burada işaretleyin. Planio abonelik ödemesi buradan geçmez."
      />
      {!canWrite ? (
        <p className="mt-4 text-sm text-zinc-600">POS tahsilatı yalnızca sahip ve muhasebe tarafından işaretlenir.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 grid gap-3 rounded-xl border border-zinc-200 p-6">
          <label className="flex flex-col gap-1 text-sm">
            Açık satış / randevu
            <select
              required
              aria-label="Açık satış"
              value={saleId}
              onChange={(event) => {
                setSaleId(event.target.value);
                const next = openSales.find((item) => item.id === event.target.value);
                setAmount(next?.remainingAmount ?? "");
              }}
              className="rounded-md border border-zinc-300 px-3 py-2"
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
          <label className="flex flex-col gap-1 text-sm">
            Tutar
            <input
              required
              aria-label="POS tutarı"
              value={amount}
              placeholder={selected?.remainingAmount}
              onChange={(event) => setAmount(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <Button type="submit" disabled={saving || !saleId}>
            {saving ? "Kaydediliyor…" : "POS çekildi"}
          </Button>
        </form>
      )}
      {openSales.length ? (
        <ul className="mt-6 grid gap-2 text-sm">
          {openSales.map((item) => (
            <li key={item.id}>
              <Link href={`/settings/sales/${item.id}`} className="underline">
                {item.customer.firstName} {item.customer.lastName} · {item.remainingAmount}{" "}
                {item.currency}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-zinc-600">Açık satış yok.</p>
      )}
      {message ? <p className="mt-4 text-sm text-emerald-800">{message}</p> : null}
      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </PageFrame>
  );
}
