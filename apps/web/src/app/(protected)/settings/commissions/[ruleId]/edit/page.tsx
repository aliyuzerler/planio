"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { CreateCommissionRuleInput } from "@xenior/types";
import { CommissionForm } from "@/app/(protected)/settings/_components/commission-form";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { updateCommissionRule } from "@/lib/commissions/commission-api";
import {
  useCanManageCommissions,
  useCommissionRuleDetail,
} from "@/lib/commissions/commission-queries";

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
    return <PageFrame>Prim kuralı yükleniyor…</PageFrame>;
  }
  if (!rule.data) {
    return <PageFrame>Prim kuralı bulunamadı.</PageFrame>;
  }

  return (
    <PageFrame width="sm">
      <PageHeader title="Prim kuralını düzenle" />
      <div className="mt-6">
        <CommissionForm
          initial={rule.data}
          submitLabel="Kaydet"
          onSubmit={handleSubmit}
        />
      </div>
    </PageFrame>
  );
}
