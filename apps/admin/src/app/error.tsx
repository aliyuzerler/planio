"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { PlanioLogo } from "@/components/brand/planio-logo";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F7FBFC] p-6 text-center">
      <PlanioLogo className="h-9 w-auto" />
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff8eb] text-[#8a6a2f]">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-[#2f5563]">
          Beklenmeyen bir hata oluştu
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#5a7380]">
          Yönetim paneli görüntülenirken bir sorun yaşandı. Lütfen tekrar
          deneyin.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-[#3d7a8c] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a]"
        >
          Tekrar dene
        </button>
        <Link
          href="/"
          className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#2f5563] ring-1 ring-[#c5dde6] transition hover:bg-[#eef6f8]"
        >
          Panele dön
        </Link>
      </div>
    </main>
  );
}
