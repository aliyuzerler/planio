"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { CreateCampaignInput } from "@xenior/types";
import { CampaignForm } from "@/app/(protected)/settings/_components/campaign-form";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { updateCampaign } from "@/lib/campaigns/campaign-api";
import {
  useCampaignDetail,
  useCanManageCampaigns,
} from "@/lib/campaigns/campaign-queries";

export default function EditCampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage = useCanManageCampaigns();
  const campaign = useCampaignDetail(campaignId);

  useEffect(() => {
    if (!canManage) router.replace(`/settings/campaigns/${campaignId}`);
  }, [canManage, router, campaignId]);

  async function handleSubmit(input: CreateCampaignInput) {
    await updateCampaign(campaignId, input);
    await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    router.replace(`/settings/campaigns/${campaignId}`);
  }

  if (!canManage) return null;
  if (campaign.isLoading) {
    return <PageFrame>Kampanya yükleniyor…</PageFrame>;
  }
  if (!campaign.data) {
    return <PageFrame>Kampanya bulunamadı.</PageFrame>;
  }

  return (
    <PageFrame width="sm">
      <PageHeader title="Kampanyayı düzenle" />
      <div className="mt-6">
        <CampaignForm
          initial={campaign.data}
          submitLabel="Kaydet"
          onSubmit={handleSubmit}
        />
      </div>
    </PageFrame>
  );
}
