"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { CreateCampaignInput } from "@xenior/types";
import { ArrowLeft } from "lucide-react";
import { CampaignForm } from "@/app/(protected)/settings/_components/campaign-form";
import { PageFrame } from "@/components/ui/page-frame";
import { updateCampaign } from "@/lib/campaigns/campaign-api";
import {
  useCampaignDetail,
  useCanManageCampaigns,
} from "@/lib/campaigns/campaign-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

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
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">Kampanya yükleniyor…</p>
      </PageFrame>
    );
  }
  if (!campaign.data) {
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">Kampanya bulunamadı.</p>
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
        href={`/settings/campaigns/${campaignId}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Detaya dön
      </Link>
      <div className="mt-4">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          Düzenleme
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          Kampanyayı düzenle
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          İndirim, tarih ve hedef hizmetleri güncelleyin.
        </p>
      </div>
      <div className="mt-8">
        <CampaignForm
          initial={campaign.data}
          submitLabel="Kaydet"
          onSubmit={handleSubmit}
        />
      </div>
    </PageFrame>
  );
}
