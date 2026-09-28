"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ExpenseCategory } from "@xenior/types";
import { ArrowLeft } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { AppError } from "@/lib/api/errors";
import { createExpense } from "@/lib/ledger/ledger-api";
import { useCanWriteCash, useCashAccountList } from "@/lib/ledger/ledger-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-[15px] text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

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
  const linkedCommissionEntryId = search.get("commissionEntryId");
  const [category, setCategory] = useState<ExpenseCategory>(
    (search.get("category") as ExpenseCategory) || "OTHER",
  );
  const [amount, setAmount] = useState(search.get("amount") ?? "");
  const [cashAccountId, setCashAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isCommissionPayout =
    category === "COMMISSION" && Boolean(linkedCommissionEntryId);

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
        commissionEntryId: isCommissionPayout ? linkedCommissionEntryId : null,
      });
      router.replace(
        isCommissionPayout ? "/settings/earnings" : "/settings/expenses",
      );
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : "Gider kaydedilemedi.");
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
        href={isCommissionPayout ? "/settings/earnings" : "/settings/expenses"}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {isCommissionPayout ? "Hakediş listesine dön" : "Gider listesine dön"}
      </Link>
      <div className="mt-4">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          {isCommissionPayout ? "Hakediş ödemesi" : "Yeni kayıt"}
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          {isCommissionPayout ? "Hakediş öde" : "Gider kaydet"}
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          {isCommissionPayout
            ? "Seçilen kasadan prim ödemesi çıkarılır."
            : "Seçilen kasadan çıkış yazılır."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
          <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
            <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
              Gider bilgileri
            </h2>
          </div>
          <div className="grid gap-4 p-5">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Kategori
              <select
                aria-label="Gider kategorisi"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as ExpenseCategory)
                }
                className={fieldClass}
                disabled={Boolean(linkedCommissionEntryId)}
              >
                {CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Tutar
              <input
                required
                aria-label="Gider tutarı"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={fieldClass}
                readOnly={isCommissionPayout}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Kasa
              <select
                aria-label="Gider kasası"
                value={cashAccountId}
                onChange={(event) => setCashAccountId(event.target.value)}
                className={fieldClass}
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
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Not
              <textarea
                aria-label="Gider notu"
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
          className="inline-flex items-center justify-center rounded-xl bg-[#7eb8c8] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6aa9bb] disabled:opacity-60"
        >
          {submitting
            ? "Kaydediliyor…"
            : isCommissionPayout
              ? "Ödemeyi kaydet"
              : "Gider kaydet"}
        </button>
      </form>
    </PageFrame>
  );
}
