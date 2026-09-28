"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { CreateCommissionRuleInput } from "@xenior/types";
import { ArrowLeft } from "lucide-react";
import { CommissionForm } from "@/app/(protected)/settings/_components/commission-form";
import { PageFrame } from "@/components/ui/page-frame";
import { updateCommissionRule } from "@/lib/commissions/commission-api";
import {
  useCanManageCommissions,
  useCommissionRuleDetail,
} from "@/lib/commissions/commission-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

export default function EditCommissionRulePage() {
  const { ruleId } = useParams<{ ruleId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage = useCanManageCommissions();
  const rule = useCommissionRuleDetail(ruleId);

  useEffect(() => {
    if (!canManage) router.replace(`/settings/commissions/${ruleId}`);
  }, [canManage, router, ruleId]);

  async function handleSubmit(input: CreateCommissionRuleInput) {
    await updateCommissionRule(ruleId, input);
    await queryClient.invalidateQueries({ queryKey: ["commission-rules"] });
    router.replace(`/settings/commissions/${ruleId}`);
  }

  if (!canManage) return null;
  if (rule.isLoading) {
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">Prim kuralı yükleniyor…</p>
      </PageFrame>
    );
  }
  if (!rule.data) {
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">Prim kuralı bulunamadı.</p>
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
        href={`/settings/commissions/${ruleId}`}
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
          Prim kuralını düzenle
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          Prim değeri ve hedef hizmeti güncelleyin.
        </p>
      </div>
      <div className="mt-8">
        <CommissionForm
          initial={rule.data}
          submitLabel="Kaydet"
          onSubmit={handleSubmit}
        />
      </div>
    </PageFrame>
  );
}
