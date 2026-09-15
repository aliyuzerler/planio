"use client";

import Link from "next/link";
import { Button } from "@xenior/ui";
import { AppointmentCalendar } from "@/app/(protected)/settings/_components/appointment-calendar";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { useSubscriptionAccess } from "@/lib/subscriptions/subscription-queries";

export default function AppointmentsPage() {
  const access = useSubscriptionAccess();
  const canWrite = access.data?.hasAccess !== false;

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Randevular"
        description="Gün, hafta ve ay görünümünde randevuyu sürükleyerek taşıyabilirsiniz. Çakışma ve slot geçerliliği sunucuda kontrol edilir."
        actions={
          canWrite ? (
            <Button asChild>
              <Link href="/settings/appointments/new">Yeni randevu</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/settings/subscription">Aboneliği yenile</Link>
            </Button>
          )
        }
      />
      <AppointmentCalendar />
    </PageFrame>
  );
}
