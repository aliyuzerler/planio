"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CreateStaffInput } from "@xenior/types";
import { ArrowLeft } from "lucide-react";
import { StaffForm } from "@/app/(protected)/settings/_components/staff-form";
import { PageFrame } from "@/components/ui/page-frame";
import { createStaff } from "@/lib/staff/staff-api";
import {
  useCanManageStaff,
  useSpecializations,
} from "@/lib/staff/staff-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

export default function NewStaffPage() {
  const router = useRouter();
  const canManage = useCanManageStaff();
  const specializations = useSpecializations(true);

  useEffect(() => {
    if (!canManage) router.replace("/settings/staff");
  }, [canManage, router]);

  async function handleSubmit(input: CreateStaffInput) {
    const staff = await createStaff(input);
    router.replace(`/settings/staff/${staff.id}`);
  }

  if (!canManage) return null;

  return (
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />
      <Link
        href="/settings/staff"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Personel listesine dön
      </Link>
      <div className="mt-4">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          Yeni kayıt
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          Kullanıcı oluştur
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          Önce panel rolünü seçin. Kayıt listede görünür; e-posta davetini detay
          sayfasından gönderin.
        </p>
      </div>
      <div className="mt-8">
        <StaffForm
          specializations={specializations.data ?? []}
          submitLabel="Kullanıcı oluştur"
          allowRoleSelect
          onSubmit={handleSubmit}
        />
      </div>
    </PageFrame>
  );
}
