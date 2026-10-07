"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@xenior/ui";
import { AppError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/money";
import {
  completePublicCheckout,
  getPublicCheckout,
} from "@/lib/checkout/checkout-api";

const PURPOSE_LABEL = {
  DEPOSIT: "Kapora",
  FULL: "Tam ödeme",
  REMAINING: "Kalan tutar",
} as const;

export default function PublicPayPage() {
  const { token } = useParams<{ token: string }>();
  const checkout = useQuery({
    queryKey: ["public-checkout", token],
    queryFn: () => getPublicCheckout(token),
    enabled: Boolean(token),
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [paid, setPaid] = useState(false);

  async function handlePay() {
    setError(null);
    setSaving(true);
    try {
      await completePublicCheckout(token);
      setPaid(true);
      await checkout.refetch();
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : "Ödeme tamamlanamadı.");
    } finally {
      setSaving(false);
    }
  }

  if (checkout.isLoading) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p>Ödeme bilgisi yükleniyor…</p>
      </main>
    );
  }
  if (checkout.isError || !checkout.data) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p role="alert">Ödeme bağlantısı bulunamadı veya süresi doldu.</p>
      </main>
    );
  }

  const item = checkout.data;
  const canPay = item.status === "PENDING" && !paid;

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">{item.businessName}</h1>
      <p className="mt-2 text-sm text-zinc-600">
        {item.customerFirstName} · {item.serviceName}
      </p>
      <p className="mt-6 text-lg">
        {PURPOSE_LABEL[item.purpose]} · {formatMoney(item.amount, item.currency)}
      </p>
      {item.status === "PAID" || paid ? (
        <p className="mt-4 text-sm text-emerald-800">Ödeme alındı. Teşekkürler.</p>
      ) : item.status !== "PENDING" ? (
        <p className="mt-4 text-sm text-zinc-700">Bu bağlantı artık kullanılamaz.</p>
      ) : (
        <Button className="mt-6" type="button" disabled={saving || !canPay} onClick={handlePay}>
          {saving ? "İşleniyor…" : "Ödemeyi tamamla"}
        </Button>
      )}
      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </main>
  );
}
