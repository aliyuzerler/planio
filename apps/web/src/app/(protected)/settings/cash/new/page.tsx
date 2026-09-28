"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CashAccountType } from "@xenior/types";
import { ArrowLeft } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { AppError } from "@/lib/api/errors";
import { createCashAccount } from "@/lib/ledger/ledger-api";
import { useCanWriteCash } from "@/lib/ledger/ledger-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-[15px] text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";

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
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />
      <Link
        href="/settings/cash"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Kasa listesine dön
      </Link>
      <div className="mt-4">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          Yeni kayıt
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          Kasa hesabı
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          Nakit veya banka hesabı ekleyin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
          <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
            <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
              Hesap bilgileri
            </h2>
          </div>
          <div className="grid gap-4 p-5">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Hesap adı
              <input
                required
                aria-label="Hesap adı"
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Tür
              <select
                aria-label="Hesap türü"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as CashAccountType)
                }
                className={fieldClass}
              >
                <option value="CASH">Nakit</option>
                <option value="BANK">Banka</option>
              </select>
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
          {submitting ? "Kaydediliyor…" : "Hesap oluştur"}
        </button>
      </form>
    </PageFrame>
  );
}
