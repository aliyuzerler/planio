"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppError } from "@/lib/api/errors";
import { getSession, verifyEmail } from "@/lib/auth/auth-api";
import { useAuthStore } from "@/stores/auth-store";

export default function VerifyEmailPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const token = useSearchParams().get("token") ?? "";
  const [message, setMessage] = useState(() =>
    token ? "E-posta doğrulanıyor…" : "",
  );
  const [error, setError] = useState<string | null>(() =>
    token ? null : "Doğrulama bağlantısı eksik.",
  );

  useEffect(() => {
    if (!token) return;

    let active = true;
    void verifyEmail({ token })
      .then(async () => {
        const session = await getSession();
        if (!active) return;
        setSession(session.user, session.accessToken, session.memberships);
        setMessage("E-posta doğrulandı. Panele yönlendiriliyorsunuz…");
        setError(null);
        router.replace("/dashboard");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setMessage("");
        setError(
          cause instanceof AppError ? cause.message : "Doğrulama başarısız.",
        );
      });

    return () => {
      active = false;
    };
  }, [router, setSession, token]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="grid w-full max-w-sm gap-4 rounded-xl border border-zinc-200 p-6">
        <h1 className="text-2xl font-semibold">E-posta doğrulama</h1>
        {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <Link href="/login" className="text-sm underline">
          Girişe dön
        </Link>
      </div>
    </main>
  );
}
