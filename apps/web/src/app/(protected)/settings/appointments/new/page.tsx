"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CreateAppointmentInput } from "@xenior/types";
import { AppointmentForm } from "@/app/(protected)/settings/_components/appointment-form";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { createAppointment } from "@/lib/appointments/appointment-api";

export default function NewAppointmentPage() {
  return (
    <Suspense fallback={<PageFrame>Form yükleniyor…</PageFrame>}>
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
    <PageFrame width="sm">
      <PageHeader
        title="Yeni randevu"
        description="Bitiş saati seçilen hizmetin süresinden hesaplanır. Aynı personelde çakışan saatler reddedilir."
      />
      <div className="mt-6">
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
