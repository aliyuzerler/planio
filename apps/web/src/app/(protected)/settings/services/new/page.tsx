"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CreateServiceInput } from "@xenior/types";
import { ServiceForm } from "@/app/(protected)/settings/_components/service-form";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { createService } from "@/lib/services/service-api";
import { useCanManageServices } from "@/lib/services/service-queries";

export default function NewServicePage() {
  const router = useRouter();
  const canManage = useCanManageServices();
  useEffect(() => {
    if (!canManage) router.replace("/settings/services");
  }, [canManage, router]);

  async function submit(input: CreateServiceInput) {
    const service = await createService(input);
    router.replace(`/settings/services/${service.id}`);
  }

  if (!canManage) return null;
  return (
    <PageFrame width="sm">
      <PageHeader
        title="Yeni hizmet"
        description="İşletmenize özel bir hizmet oluşturun."
      />
      <div className="mt-6">
        <ServiceForm submitLabel="Hizmet oluştur" onSubmit={submit} />
      </div>
    </PageFrame>
  );
}
