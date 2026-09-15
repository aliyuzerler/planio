"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSession, login } from "@/lib/auth/auth-api";
import { AppError } from "@/lib/api/errors";
import { PlanioLogo } from "@/components/brand/planio-logo";
import { isSuperAdmin } from "@/lib/auth/platform-admin";
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
      if (!isSuperAdmin(session.user.platformRole)) {
        setError("Bu panele yalnızca SUPER_ADMIN hesapları girebilir.");
        return;
      }
      setSession(session.user, session.accessToken);
      router.replace("/dashboard");
    } catch (cause) {
      setError(
        cause instanceof AppError
          ? cause.message
          : "Giriş yapılamadı.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6"
      >
        <div>
          <PlanioLogo className="mb-4 h-9" />
          <h1 className="text-2xl font-semibold">Yönetici girişi</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Yalnızca platform yöneticileri bu uygulamaya girebilir.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          E-posta
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Parola
          <input
            required
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>
      </form>
    </main>
  );
}
