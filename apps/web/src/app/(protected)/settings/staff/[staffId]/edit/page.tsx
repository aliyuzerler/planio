"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { CreateStaffInput } from "@xenior/types";
import { ArrowLeft } from "lucide-react";
import { StaffForm } from "@/app/(protected)/settings/_components/staff-form";
import { PageFrame } from "@/components/ui/page-frame";
import { updateStaff } from "@/lib/staff/staff-api";
import {
  useCanManageStaff,
  useStaffDetail,
} from "@/lib/staff/staff-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;

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
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">Personel yükleniyor…</p>
      </PageFrame>
    );
  }
  if (!staff.data) {
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">Personel bulunamadı.</p>
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
        href={`/settings/staff/${staffId}`}
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
          Kullanıcıyı düzenle
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          Profil ve iletişim bilgilerini güncelleyin.
        </p>
      </div>
      <div className="mt-8">
        <StaffForm
          initial={staff.data}
          submitLabel="Değişiklikleri kaydet"
          onSubmit={handleSubmit}
        />
      </div>
    </PageFrame>
  );
}
