"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { CreateServiceInput } from "@xenior/types";
import { ServiceForm } from "@/app/(protected)/settings/_components/service-form";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { updateService } from "@/lib/services/service-api";
import {
  useCanManageServices,
  useServiceDetail,
} from "@/lib/services/service-queries";

export default function EditServicePage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage = useCanManageServices();
  const service = useServiceDetail(serviceId);
  useEffect(() => {
    if (!canManage) router.replace(`/settings/services/${serviceId}`);
  }, [canManage, router, serviceId]);

  async function submit(input: CreateServiceInput) {
    await updateService(serviceId, input);
    await queryClient.invalidateQueries({ queryKey: ["services"] });
    router.replace(`/settings/services/${serviceId}`);
  }

  if (!canManage) return null;
  if (!service.data) return <PageFrame>Hizmet yükleniyor…</PageFrame>;
  return (
    <PageFrame width="sm">
      <PageHeader
        title="Hizmeti düzenle"
        description="Hizmet bilgilerini ve fiyatını güncelleyin."
      />
      <div className="mt-6">
        <ServiceForm
          initial={service.data}
          submitLabel="Değişiklikleri kaydet"
          onSubmit={submit}
        />
      </div>
    </PageFrame>
  );
}
