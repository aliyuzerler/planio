"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CreateCustomerInput } from "@xenior/types";
import { CustomerForm } from "@/app/(protected)/settings/_components/customer-form";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { createCustomer } from "@/lib/customers/customer-api";
import { useCanManageCustomers } from "@/lib/customers/customer-queries";

export default function NewCustomerPage() {
  const router = useRouter();
  const canManage = useCanManageCustomers();

  useEffect(() => {
    if (!canManage) router.replace("/settings/customers");
  }, [canManage, router]);

  async function handleSubmit(input: CreateCustomerInput) {
    const customer = await createCustomer(input);
    router.replace(`/settings/customers/${customer.id}`);
  }

  if (!canManage) return null;

  return (
    <PageFrame width="sm">
      <PageHeader
        title="Yeni müşteri"
        description="Müşteri profilini oluşturun. Randevu oluşturma bu aşamada yoktur."
      />
      <div className="mt-6">
        <CustomerForm submitLabel="Müşteri oluştur" onSubmit={handleSubmit} />
      </div>
    </PageFrame>
  );
}
