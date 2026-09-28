"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { CreateServiceInput } from "@xenior/types";
import { ArrowLeft } from "lucide-react";
import { ServiceForm } from "@/app/(protected)/settings/_components/service-form";
import { PageFrame } from "@/components/ui/page-frame";
import { updateService } from "@/lib/services/service-api";
import {
  useCanManageServices,
  useServiceDetail,
} from "@/lib/services/service-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

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
  if (!service.data) {
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">Hizmet yükleniyor…</p>
      </PageFrame>
    );
  }
  return (
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />
      <Link
        href={`/settings/services/${serviceId}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Hizmet detayına dön
      </Link>
      <div className="mt-4">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          Düzenleme
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          Hizmeti düzenle
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          Hizmet bilgilerini ve fiyatını güncelleyin.
        </p>
      </div>
      <div className="mt-8">
        <ServiceForm
          initial={service.data}
          submitLabel="Değişiklikleri kaydet"
          onSubmit={submit}
        />
      </div>
    </PageFrame>
  );
}
