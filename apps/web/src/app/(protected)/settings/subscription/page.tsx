"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  PlanRecord,
  SubscriptionAccess,
  SubscriptionRecord,
  SubscriptionStatus,
} from "@xenior/types";
import { Button } from "@xenior/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { AppError } from "@/lib/api/errors";
import { useCreatePaymentCheckout, usePayments } from "@/lib/payments/payment-queries";
import { useBusinessProfile } from "@/lib/business/business-queries";
import {
  useCancelSubscription,
  useCurrentSubscription,
  usePlans,
  useSubscriptionAccess,
} from "@/lib/subscriptions/subscription-queries";
import { useAuthStore } from "@/stores/auth-store";

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: "Ödeme bekleniyor",
  ACTIVE: "Aktif",
  PAST_DUE: "Ödeme bekliyor",
  PAUSED: "Duraklatıldı",
  CANCELLED: "İptal edildi",
  EXPIRED: "Süresi doldu",
};

const PERIOD_LABELS = {
  MONTHLY: "Aylık",
  SEMIANNUAL: "6 aylık",
  YEARLY: "Yıllık",
} as const;

const PAYMENT_STATUS_LABELS = {
  PENDING: "Bekliyor",
  PROCESSING: "İşleniyor",
  SUCCEEDED: "Başarılı",
  FAILED: "Başarısız",
  CANCELLED: "İptal",
  REFUNDED: "İade",
  PARTIALLY_REFUNDED: "Kısmi iade",
} as const;

function formatPrice(plan: Pick<PlanRecord, "price" | "currency">): string {
  return `${plan.price} ${plan.currency}`;
}

function formatInstant(value: string): string {
  return new Date(value).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function SubscriptionSettingsPage() {
  return (
    <Suspense
      fallback={<PageFrame>Abonelik bilgileri yükleniyor…</PageFrame>}
    >
      <SubscriptionSettingsContent />
    </Suspense>
  );
}

function SubscriptionSettingsContent() {
  const searchParams = useSearchParams();
  const paymentResult = searchParams.get("payment");
  const memberships = useAuthStore((state) => state.memberships);
  const selectedBusinessId = useAuthStore((state) => state.selectedBusinessId);
  const role = memberships.find(
    (item) => item.businessId === selectedBusinessId,
  )?.role;
  const readOnly = role === "STAFF" || role === "ACCOUNTANT";
  const plans = usePlans();
  const current = useCurrentSubscription();
  const access = useSubscriptionAccess();
  const payments = usePayments();

  if (plans.isLoading || current.isLoading || access.isLoading) {
    return <PageFrame>Abonelik bilgileri yükleniyor…</PageFrame>;
  }
  if (plans.isError || current.isError || access.isError || !access.data) {
    return (
      <PageFrame>
        <p role="alert" className="text-sm">
          Abonelik bilgileri yüklenemedi.
        </p>
      </PageFrame>
    );
  }

  return (
    <PageFrame width="sm">
      <PageHeader
        title="Abonelik"
        description="Plan fiyatları veritabanından okunur. Kart bilgisi Planio’da tutulmaz; ödeme iyzico Checkout Form üzerinden doğrulanır."
      />
      {paymentResult === "success" ? (
        <p role="status" className="mt-3 text-sm text-emerald-800">
          Ödeme doğrulandı. Abonelik güncellendi.
        </p>
      ) : null}
      {paymentResult === "failure" || paymentResult === "invalid" ? (
        <p role="alert" className="mt-3 text-sm text-amber-800">
          Ödeme doğrulanamadı. Abonelik aktifleştirilmedi.
        </p>
      ) : null}
      <CurrentSubscriptionCard
        subscription={current.data ?? null}
        access={access.data}
        readOnly={readOnly}
        role={role}
      />
      <AvailablePlans
        plans={plans.data ?? []}
        current={current.data ?? null}
        readOnly={readOnly}
      />
      {readOnly ? null : (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Ödeme kayıtları</h2>
          <div className="mt-4 grid gap-3">
            {(payments.data ?? []).map((payment) => (
              <article
                key={payment.id}
                className="rounded-xl border border-zinc-200 p-4 text-sm"
              >
                <p className="font-medium">
                  {payment.amount} {payment.currency} ·{" "}
                  {PAYMENT_STATUS_LABELS[payment.status]}
                </p>
                <p className="mt-1 text-zinc-600">
                  {formatInstant(payment.createdAt)}
                  {payment.errorCode ? ` · ${payment.errorCode}` : ""}
                </p>
              </article>
            ))}
            {payments.data?.length === 0 ? (
              <p className="text-sm text-zinc-600">Henüz ödeme kaydı yok.</p>
            ) : null}
          </div>
        </section>
      )}
    </PageFrame>
  );
}

function CurrentSubscriptionCard({
  subscription,
  access,
  readOnly,
  role,
}: {
  subscription: SubscriptionRecord | null;
  access: SubscriptionAccess;
  readOnly: boolean;
  role?: string;
}) {
  const cancel = useCancelSubscription();
  const { pushToast } = useToast();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const canCancel =
    !readOnly &&
    subscription !== null &&
    (subscription.status === "ACTIVE" ||
      subscription.status === "PAST_DUE" ||
      subscription.status === "TRIALING" ||
      subscription.status === "PAUSED");

  async function handleCancel() {
    setMessage(null);
    try {
      await cancel.mutateAsync();
      setMessage("Abonelik dönem sonunda iptal edilecek.");
      pushToast("Abonelik dönem sonunda iptal edilecek.");
    } catch (cause) {
      const text =
        cause instanceof AppError ? cause.message : "Abonelik iptal edilemedi.";
      setMessage(text);
      pushToast(text, "error");
    } finally {
      setConfirmCancel(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 p-6">
      <h2 className="text-lg font-semibold">Mevcut plan</h2>
      {subscription ? (
        <dl className="mt-4 grid gap-3 text-sm">
          <InfoRow label="Plan" value={subscription.plan.name} />
          <InfoRow label="Durum" value={STATUS_LABELS[subscription.status]} />
          <InfoRow
            label="Faturalama dönemi"
            value={PERIOD_LABELS[subscription.plan.billingPeriod]}
          />
          <InfoRow label="Fiyat" value={formatPrice(subscription.plan)} />
          <InfoRow
            label="Dönem"
            value={`${formatInstant(subscription.currentPeriodStart)} – ${formatInstant(subscription.currentPeriodEnd)}`}
          />
        </dl>
      ) : (
        <p className="mt-3 text-sm text-zinc-600">
          Henüz doğrulanmış bir abonelik yok. Plan seçildikten sonra iyzico
          ödemesi doğrulanmadan abonelik aktif olmaz.
        </p>
      )}
      <div className="mt-4 grid gap-1 text-sm text-zinc-600">
        <p>
          Erişim: {access.hasAccess ? "Açık" : "Kapalı"}
          {access.status ? ` · ${STATUS_LABELS[access.status]}` : ""}
        </p>
        <p>
          Personel: {access.usage.staff}
          {access.limits.maxStaff != null ? ` / ${access.limits.maxStaff}` : " / sınırsız"}
        </p>
        <p>
          Müşteri: {access.usage.customers}
          {access.limits.maxCustomers != null
            ? ` / ${access.limits.maxCustomers}`
            : " / sınırsız"}
        </p>
      </div>
      {readOnly ? (
        <p className="mt-4 text-sm text-zinc-600">
          {role === "ACCOUNTANT"
            ? "Muhasebe rolü Planio aboneliğini yalnızca görüntüleyebilir. Yenileme işletme sahibine aittir."
            : "Personel abonelik bilgilerini yalnızca görüntüleyebilir."}
        </p>
      ) : canCancel ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          disabled={cancel.isPending}
          onClick={() => setConfirmCancel(true)}
        >
          {cancel.isPending ? "İptal ediliyor…" : "Aboneliği iptal et"}
        </Button>
      ) : null}
      {message ? (
        <p role="status" className="mt-3 text-sm text-zinc-700">
          {message}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirmCancel}
        title="Aboneliği iptal et"
        description="Abonelik dönem sonunda iptal edilir. Kart bilgisi Planio’da tutulmaz."
        confirmLabel="Onayla"
        pending={cancel.isPending}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => void handleCancel()}
      />
    </section>
  );
}

function AvailablePlans({
  plans,
  current,
  readOnly,
}: {
  plans: PlanRecord[];
  current: SubscriptionRecord | null;
  readOnly: boolean;
}) {
  const checkout = useCreatePaymentCheckout();
  const business = useBusinessProfile();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [identityNumber, setIdentityNumber] = useState("");
  const [gsmNumber, setGsmNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country] = useState("Türkiye");
  const [message, setMessage] = useState<string | null>(null);
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  async function handlePay() {
    if (!selectedPlan) return;
    setMessage(null);
    try {
      const session = await checkout.mutateAsync({
        planId: selectedPlan.id,
        identityNumber,
        gsmNumber,
        billingAddress: {
          address: address || business.data?.address || "Adres belirtilmedi",
          city,
          country,
          contactName: business.data?.name,
        },
      });
      if (session.payment.status === "SUCCEEDED") {
        setMessage("Ödeme doğrulandı. Abonelik aktif.");
      } else {
        setMessage("Ödeme oturumu oluşturuldu. iyzico sonucu bekleniyor.");
      }
    } catch (cause) {
      setMessage(cause instanceof AppError ? cause.message : "Ödeme başlatılamadı.");
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Kullanılabilir planlar</h2>
      <div className="mt-4 grid gap-3">
        {plans.map((plan) => {
          const selected =
            current?.status === "ACTIVE" && current.plan.id === plan.id;
          return (
            <article
              key={plan.id}
              className="rounded-xl border border-zinc-200 p-4 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {plan.name} · {PERIOD_LABELS[plan.billingPeriod]}
                </p>
                <p>{formatPrice(plan)}</p>
              </div>
              {readOnly ? null : (
                <Button
                  type="button"
                  className="mt-3"
                  variant={selectedPlanId === plan.id ? "default" : "outline"}
                  disabled={selected}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  {selected ? "Mevcut plan" : "Planı seç"}
                </Button>
              )}
            </article>
          );
        })}
      </div>
      {readOnly || !selectedPlan ? null : (
        <form
          className="mt-6 grid gap-3 rounded-xl border border-zinc-200 p-4 text-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void handlePay();
          }}
        >
          <h3 className="font-medium">Ödeme bilgileri</h3>
          <p className="text-zinc-600">
            Kart numarası ve CVV bu forma girilmez. iyzico formu kartı kendi
            sayfasında alır.
          </p>
          <label className="grid gap-1">
            T.C. kimlik no
            <input
              required
              minLength={5}
              value={identityNumber}
              onChange={(event) => setIdentityNumber(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-1">
            GSM
            <input
              required
              aria-label="GSM"
              placeholder="+905551112233"
              value={gsmNumber}
              onChange={(event) => setGsmNumber(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-1">
            Adres
            <input
              required
              minLength={3}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-1">
            Şehir
            <input
              required
              minLength={2}
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <Button type="submit" disabled={checkout.isPending}>
            {checkout.isPending ? "Ödeme başlatılıyor…" : "iyzico ile öde"}
          </Button>
        </form>
      )}
      {message ? (
        <p role="status" className="mt-3 text-sm text-zinc-700">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-zinc-600">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
