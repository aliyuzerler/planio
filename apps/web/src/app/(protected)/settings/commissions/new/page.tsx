"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CreateCommissionRuleInput } from "@xenior/types";
import { CommissionForm } from "@/app/(protected)/settings/_components/commission-form";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { createCommissionRule } from "@/lib/commissions/commission-api";
import { useCanManageCommissions } from "@/lib/commissions/commission-queries";

export default function NewCommissionRulePage() {
  const router = useRouter();
  const canManage = useCanManageCommissions();
  useEffect(() => {
    if (!canManage) router.replace("/settings/commissions");
  }, [canManage, router]);

  async function submit(input: CreateCommissionRuleInput) {
    const rule = await createCommissionRule(input);
    router.replace(`/settings/commissions/${rule.id}`);
  }

  if (!canManage) return null;
  return (
    <PageFrame width="sm">
      <PageHeader
        title="Yeni prim kuralı"
        description="Tamamlanan randevuda seçilen hizmet için otomatik prim satırı yazılır."
      />
      <div className="mt-6">
        <CommissionForm submitLabel="Kural oluştur" onSubmit={submit} />
      </div>
    </PageFrame>
  );
}
