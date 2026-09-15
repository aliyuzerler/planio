"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppError } from "@/lib/api/errors";
import { verifyEmail } from "@/lib/auth/auth-api";

export default function VerifyEmailPage() {
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
      .then(() => {
        if (!active) return;
        setMessage("E-posta doğrulandı.");
        setError(null);
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
  }, [token]);

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
