"use client";

import { useRouter } from "next/navigation";
import { Button } from "@xenior/ui";
import { useAuthStore } from "@/stores/auth-store";

export default function SelectBusinessPage() {
  const router = useRouter();
  const memberships = useAuthStore((state) => state.memberships).filter(
    (membership) =>
      membership.isActive && membership.businessStatus === "ACTIVE",
  );
  const selectBusiness = useAuthStore((state) => state.selectBusiness);

  function handleSelect(businessId: string) {
    if (selectBusiness(businessId)) {
      router.replace("/dashboard");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-xl border border-zinc-200 p-6">
        <h1 className="text-2xl font-semibold">İşletme seçin</h1>
        <p className="mt-1 text-sm text-zinc-600">
          İşlem yapmak istediğiniz aktif işletmeyi seçin.
        </p>
        <div className="mt-6 grid gap-3">
          {memberships.map((membership) => (
            <Button
              key={membership.businessId}
              type="button"
              variant="outline"
              onClick={() => handleSelect(membership.businessId)}
              className="h-auto justify-start rounded-lg p-4 text-left"
            >
              <span>
                <span className="block font-medium">
                  {membership.businessName}
                </span>
                <span className="block text-sm text-zinc-600">
                  {membership.role}
                </span>
              </span>
            </Button>
          ))}
          {memberships.length === 0 ? (
            <p role="alert" className="text-sm text-red-700">
              Erişilebilir aktif işletme bulunamadı.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
