"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlanioLogo } from "@/components/brand/planio-logo";
import { getSession, login } from "@/lib/auth/auth-api";
import { AppError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      const session = await getSession();
      setSession(session.user, session.accessToken, session.memberships);
      router.replace("/dashboard");
    } catch (cause) {
      setError(
        cause instanceof AppError ? cause.message : "Giriş yapılamadı.",
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
            Giriş yap
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-[#5a7380]">
            İşletme hesabınıza güvenli biçimde erişin.
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#3d6b7a]">
          E-posta
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg border border-[#c5dde6] bg-[#F7FBFC] px-3.5 py-2.5 text-[15px] font-normal text-[#1e3340] outline-none transition focus:border-[#7eb8c8] focus:bg-white focus:ring-2 focus:ring-[#7eb8c8]/25"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#3d6b7a]">
          Parola
          <input
            required
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border border-[#c5dde6] bg-[#F7FBFC] px-3.5 py-2.5 text-[15px] font-normal text-[#1e3340] outline-none transition focus:border-[#7eb8c8] focus:bg-white focus:ring-2 focus:ring-[#7eb8c8]/25"
          />
        </label>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-[13px] font-semibold text-[#3d6b7a] underline-offset-2 hover:underline"
          >
            Parolamı unuttum
          </Link>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-[#7eb8c8] px-5 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#6aa9bb] disabled:translate-y-0 disabled:opacity-50"
        >
          {submitting ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>

        <p className="text-center text-[13px] text-[#5a7380]">
          Hesabınız yok mu?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#3d6b7a] underline-offset-2 hover:underline"
          >
            Yeni işletme hesabı oluşturun
          </Link>
        </p>
      </form>
    </main>
  );
}
