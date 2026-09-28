"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CreateCommissionRuleInput } from "@xenior/types";
import { ArrowLeft } from "lucide-react";
import { CommissionForm } from "@/app/(protected)/settings/_components/commission-form";
import { PageFrame } from "@/components/ui/page-frame";
import { createCommissionRule } from "@/lib/commissions/commission-api";
import { useCanManageCommissions } from "@/lib/commissions/commission-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

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
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />
      <Link
        href="/settings/commissions"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Prim kurallarına dön
      </Link>
      <div className="mt-4">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          Yeni kayıt
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          Prim kuralı oluştur
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          Tamamlanan randevuda seçilen hizmet için otomatik prim satırı yazılır.
        </p>
      </div>
      <div className="mt-8">
        <CommissionForm submitLabel="Kural oluştur" onSubmit={submit} />
      </div>
    </PageFrame>
  );
}
