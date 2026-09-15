"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppError } from "@/lib/api/errors";
import { acceptInvite, getSession } from "@/lib/auth/auth-api";
import { useAuthStore } from "@/stores/auth-store";

export default function InvitePage() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await acceptInvite({ token, password });
      const session = await getSession();
      setSession(session.user, session.accessToken, session.memberships);
      router.replace("/dashboard");
    } catch (cause) {
      setError(
        cause instanceof AppError ? cause.message : "Davet kabul edilemedi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-zinc-200 p-6"
      >
        <div>
          <h1 className="text-2xl font-semibold">Daveti kabul et</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Hesabınızı tamamlamak için bir parola belirleyin.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Parola
          <input
            required
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
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
          disabled={submitting || !token}
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Katılıyor…" : "Daveti kabul et"}
        </button>
      </form>
    </main>
  );
}
