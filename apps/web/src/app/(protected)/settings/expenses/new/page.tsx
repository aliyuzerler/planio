"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ExpenseCategory } from "@xenior/types";
import { Button } from "@xenior/ui";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { AppError } from "@/lib/api/errors";
import { createExpense } from "@/lib/ledger/ledger-api";
import { useCanWriteCash, useCashAccountList } from "@/lib/ledger/ledger-queries";

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "RENT", label: "Kira" },
  { value: "UTILITY", label: "Fatura" },
  { value: "MATERIAL", label: "Malzeme" },
  { value: "SALARY", label: "Maaş" },
  { value: "COMMISSION", label: "Prim" },
  { value: "OTHER", label: "Diğer" },
];

export default function NewExpensePage() {
  const router = useRouter();
  const search = useSearchParams();
  const canWrite = useCanWriteCash();
  const accounts = useCashAccountList();
  const [category, setCategory] = useState<ExpenseCategory>(
    (search.get("category") as ExpenseCategory) || "OTHER",
  );
  const [amount, setAmount] = useState(search.get("amount") ?? "");
  const [cashAccountId, setCashAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const commissionEntryId = search.get("commissionEntryId");

  useEffect(() => {
    if (!canWrite) router.replace("/settings/expenses");
  }, [canWrite, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createExpense({
        category,
        amount,
        cashAccountId: cashAccountId || undefined,
        notes: notes || null,
        commissionEntryId: commissionEntryId || null,
      });
      router.replace("/settings/expenses");
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : "Gider kaydedilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canWrite) return null;
  return (
    <PageFrame width="sm">
      <PageHeader title="Yeni gider" description="Seçilen kasadan çıkış yazılır." />
      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 rounded-xl border border-zinc-200 p-6">
        <label className="flex flex-col gap-1 text-sm">
          Kategori
          <select
            aria-label="Gider kategorisi"
            value={category}
            onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          >
            {CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tutar
          <input
            required
            aria-label="Gider tutarı"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Kasa
          <select
            aria-label="Gider kasası"
            value={cashAccountId}
            onChange={(event) => setCashAccountId(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          >
            <option value="">Varsayılan nakit kasa</option>
            {(accounts.data ?? [])
              .filter((account) => account.isActive)
              .map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Not
          <textarea
            aria-label="Gider notu"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Kaydediliyor…" : "Gider kaydet"}
        </Button>
      </form>
    </PageFrame>
  );
}
