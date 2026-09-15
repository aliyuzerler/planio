"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CreateStaffInput } from "@xenior/types";
import { StaffForm } from "@/app/(protected)/settings/_components/staff-form";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { createStaff } from "@/lib/staff/staff-api";
import {
  useCanManageStaff,
  useSpecializations,
} from "@/lib/staff/staff-queries";

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
    <PageFrame width="sm">
      <PageHeader
        title="Yeni personel"
        description="Personel profilini ve başlangıç uzmanlıklarını oluşturun."
      />
      <div className="mt-6">
        <StaffForm
          specializations={specializations.data ?? []}
          submitLabel="Personel oluştur"
          onSubmit={handleSubmit}
        />
      </div>
    </PageFrame>
  );
}
