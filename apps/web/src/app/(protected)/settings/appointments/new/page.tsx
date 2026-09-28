"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { CreateAppointmentInput } from "@xenior/types";
import { ArrowLeft } from "lucide-react";
import { AppointmentForm } from "@/app/(protected)/settings/_components/appointment-form";
import { PageFrame } from "@/components/ui/page-frame";
import { createAppointment } from "@/lib/appointments/appointment-api";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

export default function NewAppointmentPage() {
  return (
    <Suspense
      fallback={
        <PageFrame>
          <p className="text-sm text-[#5a7380]">Form yükleniyor…</p>
        </PageFrame>
      }
    >
      <NewAppointmentForm />
    </Suspense>
  );
}

function NewAppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const suggestedStartAt = searchParams.get("startAt") ?? undefined;
  const suggestedStaffId = searchParams.get("staffId") ?? undefined;

  async function handleSubmit(input: CreateAppointmentInput) {
    const appointment = await createAppointment(input);
    router.push(`/settings/appointments/${appointment.id}`);
  }

  return (
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <Link
        href="/settings/appointments"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Takvime dön
      </Link>

      <div className="mt-4">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          Yeni kayıt
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          Randevu oluştur
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          Bitiş saati seçilen hizmetin süresinden hesaplanır. Aynı personelde
          çakışan saatler reddedilir.
        </p>
      </div>

      <div className="mt-8">
        <AppointmentForm
          suggestedStartAt={suggestedStartAt}
          suggestedStaffId={suggestedStaffId}
          submitLabel="Randevu oluştur"
          onSubmit={handleSubmit}
        />
      </div>
    </PageFrame>
  );
}
