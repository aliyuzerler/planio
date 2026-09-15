"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CreateCampaignInput } from "@xenior/types";
import { CampaignForm } from "@/app/(protected)/settings/_components/campaign-form";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { createCampaign } from "@/lib/campaigns/campaign-api";
import { useCanManageCampaigns } from "@/lib/campaigns/campaign-queries";

export default function NewCampaignPage() {
  const router = useRouter();
  const canManage = useCanManageCampaigns();
  useEffect(() => {
    if (!canManage) router.replace("/settings/campaigns");
  }, [canManage, router]);

  async function submit(input: CreateCampaignInput) {
    const campaign = await createCampaign(input);
    router.replace(`/settings/campaigns/${campaign.id}`);
  }

  if (!canManage) return null;
  return (
    <PageFrame width="sm">
      <PageHeader
        title="Yeni kampanya"
        description="Aktif aralıkta seçilen hizmetlerin randevu fiyatı otomatik düşer."
      />
      <div className="mt-6">
        <CampaignForm submitLabel="Kampanya oluştur" onSubmit={submit} />
      </div>
    </PageFrame>
  );
}
