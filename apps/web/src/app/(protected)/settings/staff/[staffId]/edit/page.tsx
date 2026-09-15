"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { CreateStaffInput } from "@xenior/types";
import { StaffForm } from "@/app/(protected)/settings/_components/staff-form";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { updateStaff } from "@/lib/staff/staff-api";
import {
  useCanManageStaff,
  useStaffDetail,
} from "@/lib/staff/staff-queries";

export default function EditStaffPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage = useCanManageStaff();
  const staff = useStaffDetail(staffId);

  useEffect(() => {
    if (!canManage) router.replace(`/settings/staff/${staffId}`);
  }, [canManage, router, staffId]);

  async function handleSubmit(input: CreateStaffInput) {
    await updateStaff(staffId, {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email,
      notes: input.notes,
    });
    await queryClient.invalidateQueries({ queryKey: ["staff"] });
    router.replace(`/settings/staff/${staffId}`);
  }

  if (!canManage) return null;
  if (staff.isLoading) {
    return <PageFrame>Personel yükleniyor…</PageFrame>;
  }
  if (!staff.data) {
    return <PageFrame>Personel bulunamadı.</PageFrame>;
  }

  return (
    <PageFrame width="sm">
      <PageHeader
        title="Personeli düzenle"
        description="Profil ve iletişim bilgilerini güncelleyin."
      />
      <div className="mt-6">
        <StaffForm
          initial={staff.data}
          submitLabel="Değişiklikleri kaydet"
          onSubmit={handleSubmit}
        />
      </div>
    </PageFrame>
  );
}
