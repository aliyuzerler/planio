"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlanioLogo } from "@/components/brand/planio-logo";
import { AppError } from "@/lib/api/errors";
import { resetPassword } from "@/lib/auth/auth-api";

export default function ResetPasswordPage() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await resetPassword({ token, password });
      setMessage("Parola güncellendi. Şimdi giriş yapabilirsiniz.");
    } catch (cause) {
      setError(
        cause instanceof AppError ? cause.message : "Parola güncellenemedi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[#b8e6df]/35 blur-[110px]"
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex w-full max-w-md flex-col gap-4 rounded-2xl border border-[#c5dde6]/70 bg-white p-6 shadow-[0_10px_25px_-5px_rgba(61,107,122,0.08)] sm:p-8"
      >
        <div>
          <Link href="/" aria-label="Planio ana sayfa" className="inline-flex">
            <PlanioLogo className="mb-5 h-9" />
          </Link>
          <h1
            className="text-2xl font-bold tracking-tight text-[#2f5563] sm:text-3xl"
            style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
          >
            Yeni parola
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-[#5a7380]">
            En az 12 karakterlik yeni bir parola belirleyin.
          </p>
        </div>

        {!token ? (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700"
          >
            Sıfırlama bağlantısı eksik veya geçersiz.
          </p>
        ) : null}

        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#3d6b7a]">
          Yeni parola
          <input
            required
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border border-[#c5dde6] bg-[#F7FBFC] px-3.5 py-2.5 text-[15px] font-normal text-[#1e3340] outline-none transition focus:border-[#7eb8c8] focus:bg-white focus:ring-2 focus:ring-[#7eb8c8]/25"
          />
        </label>

        {error ? (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700"
          >
            {error}
          </p>
        ) : null}

        {message ? (
          <p
            role="status"
            className="rounded-lg bg-[#eef6f8] px-3 py-2 text-[13px] font-semibold text-[#3d6b7a]"
          >
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !token}
          className="rounded-xl bg-[#7eb8c8] px-5 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#6aa9bb] disabled:translate-y-0 disabled:opacity-50"
        >
          {submitting ? "Kaydediliyor…" : "Parolayı güncelle"}
        </button>

        <p className="text-center text-[13px] text-[#5a7380]">
          <Link
            href="/login"
            className="font-semibold text-[#3d6b7a] underline-offset-2 hover:underline"
          >
            Girişe dön
          </Link>
        </p>
      </form>
    </main>
  );
}
