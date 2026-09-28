"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CreateCampaignInput } from "@xenior/types";
import { ArrowLeft } from "lucide-react";
import { CampaignForm } from "@/app/(protected)/settings/_components/campaign-form";
import { PageFrame } from "@/components/ui/page-frame";
import { createCampaign } from "@/lib/campaigns/campaign-api";
import { useCanManageCampaigns } from "@/lib/campaigns/campaign-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

export default function NewCampaignPage() {
  const router = useRouter();
  const canManage = useCanManageCampaigns();
  useEffect(() => {
    if (!canManage) router.replace("/settings/campaigns");
  }, [canManage, router]);

  async function submit(input: CreateCampaignInput) {
    const campaign = await createCampaign(input);
    router.push(`/settings/campaigns/${campaign.id}`);
  }

  if (!canManage) return null;
  return (
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />
      <Link
        href="/settings/campaigns"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Kampanya listesine dön
      </Link>
      <div className="mt-4">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          Yeni kayıt
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          Kampanya oluştur
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          Aktif aralıkta seçilen hizmetlerin randevu fiyatı otomatik düşer.
        </p>
      </div>
      <div className="mt-8">
        <CampaignForm submitLabel="Kampanya oluştur" onSubmit={submit} />
      </div>
    </PageFrame>
  );
}
