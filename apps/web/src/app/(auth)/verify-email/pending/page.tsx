"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlanioLogo } from "@/components/brand/planio-logo";

export default function VerifyEmailPendingPage() {
  const email = useSearchParams().get("email") ?? "";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[#b8e6df]/35 blur-[110px]"
      />

      <div className="relative z-10 grid w-full max-w-md gap-4 rounded-2xl border border-[#c5dde6]/70 bg-white p-6 shadow-[0_10px_25px_-5px_rgba(61,107,122,0.08)] sm:p-8">
        <Link href="/" aria-label="Planio ana sayfa" className="inline-flex">
          <PlanioLogo className="mb-2 h-9" />
        </Link>
        <h1
          className="text-2xl font-bold tracking-tight text-[#2f5563]"
          style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
        >
          E-postanızı doğrulayın
        </h1>
        <p className="text-[15px] leading-6 text-[#5a7380]">
          {email ? (
            <>
              <span className="font-semibold text-[#3d6b7a]">{email}</span>{" "}
              adresine bir doğrulama bağlantısı gönderdik. Panele erişmek için
              bağlantıya tıklayın.
            </>
          ) : (
            <>
              Panele erişmek için e-postanızdaki doğrulama bağlantısına tıklayın.
            </>
          )}
        </p>
        <p className="text-[13px] leading-5 text-[#5a7380]">
          Gelen kutusu ve spam klasörünü kontrol edin. Bağlantı yaklaşık 24 saat
          geçerlidir.
        </p>
        <Link
          href="/login"
          className="text-[13px] font-semibold text-[#3d6b7a] underline-offset-2 hover:underline"
        >
          Girişe dön
        </Link>
      </div>
    </main>
  );
}
