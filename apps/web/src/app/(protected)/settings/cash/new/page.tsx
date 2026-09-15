"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CashAccountType } from "@xenior/types";
import { Button } from "@xenior/ui";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { AppError } from "@/lib/api/errors";
import { createCashAccount } from "@/lib/ledger/ledger-api";
import { useCanWriteCash } from "@/lib/ledger/ledger-queries";

export default function NewCashAccountPage() {
  const router = useRouter();
  const canWrite = useCanWriteCash();
  const [name, setName] = useState("");
  const [type, setType] = useState<CashAccountType>("CASH");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!canWrite) router.replace("/settings/cash");
  }, [canWrite, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createCashAccount({ name, type });
      router.replace("/settings/cash");
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : "Hesap oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canWrite) return null;
  return (
    <PageFrame width="sm">
      <PageHeader title="Yeni kasa hesabı" description="Nakit veya banka hesabı ekleyin." />
      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 rounded-xl border border-zinc-200 p-6">
        <label className="flex flex-col gap-1 text-sm">
          Hesap adı
          <input
            required
            aria-label="Hesap adı"
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tür
          <select
            aria-label="Hesap türü"
            value={type}
            onChange={(event) => setType(event.target.value as CashAccountType)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          >
            <option value="CASH">Nakit</option>
            <option value="BANK">Banka</option>
          </select>
        </label>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Kaydediliyor…" : "Hesap oluştur"}
        </Button>
      </form>
    </PageFrame>
  );
}
