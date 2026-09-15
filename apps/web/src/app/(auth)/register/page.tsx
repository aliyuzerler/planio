"use client";

import {
  useState,
  type FormEvent,
  type InputHTMLAttributes,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppError } from "@/lib/api/errors";
import { PlanioLogo } from "@/components/brand/planio-logo";
import { getSession, register } from "@/lib/auth/auth-api";
import { useAuthStore } from "@/stores/auth-store";

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      await register({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        firstName: String(form.get("firstName") ?? ""),
        lastName: String(form.get("lastName") ?? ""),
        businessName: String(form.get("businessName") ?? ""),
        businessPhone: String(form.get("businessPhone") ?? "") || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        privacyAccepted: form.get("privacyAccepted") === "on",
      });
      const session = await getSession();
      setSession(session.user, session.accessToken, session.memberships);
      router.replace("/dashboard");
    } catch (cause) {
      setError(
        cause instanceof AppError ? cause.message : "Hesap oluşturulamadı.",
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
        className="relative z-10 grid w-full max-w-lg gap-4 rounded-2xl border border-[#c5dde6]/70 bg-white p-6 shadow-[0_10px_25px_-5px_rgba(61,107,122,0.08)] sm:grid-cols-2 sm:p-8"
      >
        <div className="sm:col-span-2">
          <Link href="/" aria-label="Planio ana sayfa" className="inline-flex">
            <PlanioLogo className="mb-5 h-9" />
          </Link>
          <h1
            className="text-2xl font-bold tracking-tight text-[#2f5563] sm:text-3xl"
            style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
          >
            İşletme hesabı oluştur
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-[#5a7380]">
            İlk kullanıcı işletme sahibi olarak oluşturulur. Randevu ve tahsilatı
            tek panelden yönetmeye hemen başlayabilirsiniz.
          </p>
        </div>

        <Field name="firstName" label="Ad" autoComplete="given-name" />
        <Field name="lastName" label="Soyad" autoComplete="family-name" />
        <Field
          name="businessName"
          label="İşletme adı"
          autoComplete="organization"
          className="sm:col-span-2"
        />
        <Field
          name="businessPhone"
          label="İşletme telefonu (opsiyonel)"
          type="tel"
          autoComplete="tel"
          required={false}
          className="sm:col-span-2"
        />
        <Field
          name="email"
          label="E-posta"
          type="email"
          autoComplete="email"
          className="sm:col-span-2"
        />
        <Field
          name="password"
          label="Parola (en az 12 karakter)"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          className="sm:col-span-2"
        />

        <label className="flex items-start gap-2.5 text-[13px] leading-5 text-[#5a7380] sm:col-span-2">
          <input
            type="checkbox"
            name="privacyAccepted"
            required
            className="mt-0.5 h-4 w-4 rounded border-[#c5dde6] text-[#7eb8c8] accent-[#7eb8c8]"
          />
          <span>
            <Link
              href="/gizlilik"
              className="font-semibold text-[#3d6b7a] underline-offset-2 hover:underline"
            >
              Gizlilik politikası
            </Link>{" "}
            ve KVKK aydınlatma metnini okudum; kişisel verilerimin işlenmesini
            kabul ediyorum.
          </span>
        </label>

        {error ? (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700 sm:col-span-2"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-[#7eb8c8] px-5 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#6aa9bb] disabled:translate-y-0 disabled:opacity-50 sm:col-span-2"
        >
          {submitting ? "Oluşturuluyor…" : "Ücretsiz hesap oluştur"}
        </button>

        <p className="text-center text-[13px] text-[#5a7380] sm:col-span-2">
          Zaten hesabınız var mı?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#3d6b7a] underline-offset-2 hover:underline"
          >
            Giriş yapın
          </Link>
        </p>
      </form>
    </main>
  );
}

function Field({
  label,
  className,
  required = true,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-[13px] font-semibold text-[#3d6b7a] ${className ?? ""}`}>
      {label}
      <input
        {...props}
        required={required}
        className="rounded-lg border border-[#c5dde6] bg-[#F7FBFC] px-3.5 py-2.5 text-[15px] font-normal text-[#1e3340] outline-none transition placeholder:text-[#5a7380]/70 focus:border-[#7eb8c8] focus:bg-white focus:ring-2 focus:ring-[#7eb8c8]/25"
      />
    </label>
  );
}
