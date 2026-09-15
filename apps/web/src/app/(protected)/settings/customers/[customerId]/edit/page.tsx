"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { CreateCustomerInput } from "@xenior/types";
import { CustomerForm } from "@/app/(protected)/settings/_components/customer-form";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { updateCustomer } from "@/lib/customers/customer-api";
import {
  useCanManageCustomers,
  useCustomerDetail,
} from "@/lib/customers/customer-queries";

export default function EditCustomerPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage = useCanManageCustomers();
  const customer = useCustomerDetail(customerId);

  useEffect(() => {
    if (!canManage) router.replace(`/settings/customers/${customerId}`);
  }, [canManage, router, customerId]);

  async function handleSubmit(input: CreateCustomerInput) {
    await updateCustomer(customerId, input);
    await queryClient.invalidateQueries({ queryKey: ["customers"] });
    router.replace(`/settings/customers/${customerId}`);
  }

  if (!canManage) return null;
  if (customer.isLoading) {
    return <PageFrame>Müşteri yükleniyor…</PageFrame>;
  }
  if (!customer.data) {
    return <PageFrame>Müşteri bulunamadı.</PageFrame>;
  }

  return (
    <PageFrame width="sm">
      <PageHeader
        title="Müşteriyi düzenle"
        description="Profil ve iletişim bilgilerini güncelleyin."
      />
      <div className="mt-6">
        <CustomerForm
          initial={customer.data}
          submitLabel="Değişiklikleri kaydet"
          onSubmit={handleSubmit}
        />
      </div>
    </PageFrame>
  );
}
