"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordInput } from "@/components/ui/password-input";
import { AppError } from "@/lib/api/errors";
import { acceptInvite, getSession } from "@/lib/auth/auth-api";
import { useAuthStore } from "@/stores/auth-store";

type InviteMode = "create" | "existing";

export default function InvitePage() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [mode, setMode] = useState<InviteMode>("create");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await acceptInvite(
        mode === "create"
          ? { token, password }
          : { token, currentPassword },
      );
      const session = await getSession();
      setSession(session.user, session.accessToken, session.memberships);
      router.replace("/dashboard");
    } catch (cause) {
      if (cause instanceof AppError && cause.code === "CURRENT_PASSWORD_REQUIRED") {
        setMode("existing");
        setNotice(
          "Bu e-posta adresiyle zaten bir hesabınız var. Devam etmek için mevcut parolanızı girin.",
        );
      } else {
        setError(
          cause instanceof AppError ? cause.message : "Davet kabul edilemedi.",
        );
      }
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
            {mode === "create"
              ? "Hesabınızı tamamlamak için bir parola belirleyin."
              : "Bu e-postayla hesabınız var. Devam etmek için mevcut parolanızı girin."}
          </p>
        </div>

        <div className="flex rounded-md border border-zinc-300 p-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode("create");
              setError(null);
              setNotice(null);
            }}
            className={`flex-1 rounded px-3 py-1.5 ${
              mode === "create"
                ? "bg-zinc-950 text-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Hesap oluştur
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("existing");
              setError(null);
              setNotice(null);
            }}
            className={`flex-1 rounded px-3 py-1.5 ${
              mode === "existing"
                ? "bg-zinc-950 text-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Zaten hesabım var
          </button>
        </div>

        {mode === "create" ? (
          <label className="flex flex-col gap-1 text-sm">
            Parola
            <PasswordInput
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-sm">
            Mevcut parolanız
            <PasswordInput
              required
              maxLength={128}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
        )}

        {notice ? (
          <p role="status" className="text-sm text-zinc-700">
            {notice}
          </p>
        ) : null}
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
