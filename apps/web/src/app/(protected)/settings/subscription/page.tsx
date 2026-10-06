"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type {
  PlanRecord,
  SubscriptionAccess,
  SubscriptionRecord,
  SubscriptionStatus,
} from "@xenior/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageFrame } from "@/components/ui/page-frame";
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
import { subscriptionStatusText } from "@/lib/subscriptions/trial";
import { useAuthStore } from "@/stores/auth-store";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-[15px] text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";
const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-[#3d7a8c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a] disabled:opacity-60";
const btnOutline =
  "inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5563] ring-1 ring-[#c5dde6] transition hover:bg-[#eef6f8] disabled:opacity-60";

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: "Deneme",
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
      fallback={
        <PageFrame>
          <p className="text-sm text-[#5a7380]">Abonelik bilgileri yükleniyor…</p>
        </PageFrame>
      }
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
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">Abonelik bilgileri yükleniyor…</p>
      </PageFrame>
    );
  }
  if (plans.isError || current.isError || access.isError || !access.data) {
    return (
      <PageFrame>
        <p role="alert" className="text-sm text-red-700">
          Abonelik bilgileri yüklenemedi.
        </p>
      </PageFrame>
    );
  }

  return (
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <div>
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          Ayarlar
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          Abonelik
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
          Plan fiyatları veritabanından okunur. Kart bilgisi Planio’da tutulmaz;
          ödeme iyzico Checkout Form üzerinden doğrulanır.
        </p>
      </div>

      {paymentResult === "success" ? (
        <p role="status" className="mt-4 rounded-xl bg-[#b8e6df]/35 px-4 py-3 text-sm text-[#2f5563] ring-1 ring-[#b8e6df]/60">
          Ödeme doğrulandı. Abonelik güncellendi.
        </p>
      ) : null}
      {paymentResult === "failure" || paymentResult === "invalid" ? (
        <p role="alert" className="mt-4 rounded-xl bg-[#fff8eb] px-4 py-3 text-sm text-[#8a6a2f] ring-1 ring-[#f0e0b8]">
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
        <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
          <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
            <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
              Ödeme kayıtları
            </h2>
          </div>
          <div className="p-4 sm:p-5">
            {(payments.data ?? []).length ? (
              <ul className="divide-y divide-[#e4f0f4] overflow-hidden rounded-xl ring-1 ring-[#e4f0f4]">
                {(payments.data ?? []).map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div>
                      <p className="text-[15px] font-semibold text-[#1e3340]">
                        {payment.amount} {payment.currency}
                      </p>
                      <p className="mt-0.5 text-[13px] text-[#5a7380]">
                        {formatInstant(payment.createdAt)}
                        {payment.errorCode ? ` · ${payment.errorCode}` : ""}
                      </p>
                    </div>
                    <span className="inline-flex rounded-full bg-[#eef6f8] px-2.5 py-0.5 text-xs font-semibold text-[#3d6b7a]">
                      {PAYMENT_STATUS_LABELS[payment.status]}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#5a7380]">Henüz ödeme kaydı yok.</p>
            )}
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
    <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
      <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
        <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
          Mevcut plan
        </h2>
      </div>
      <div className="p-5">
        {subscription ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Plan" value={subscription.plan.name} />
            <InfoRow
              label="Durum"
              value={subscriptionStatusText(
                subscription.status,
                subscription.currentPeriodEnd,
                STATUS_LABELS[subscription.status],
              )}
            />
            <InfoRow
              label="Faturalama dönemi"
              value={PERIOD_LABELS[subscription.plan.billingPeriod]}
            />
            <InfoRow label="Fiyat" value={formatPrice(subscription.plan)} />
            <div className="sm:col-span-2">
              <InfoRow
                label="Dönem"
                value={`${formatInstant(subscription.currentPeriodStart)} – ${formatInstant(subscription.currentPeriodEnd)}`}
              />
            </div>
          </dl>
        ) : (
          <p className="text-sm text-[#5a7380]">
            Henüz doğrulanmış bir abonelik yok. Plan seçildikten sonra iyzico
            ödemesi doğrulanmadan abonelik aktif olmaz.
          </p>
        )}
        <div className="mt-4 grid gap-1 rounded-xl bg-[#F7FBFC] px-4 py-3 text-[13px] text-[#5a7380] ring-1 ring-[#e4f0f4]">
          <p>
            Erişim: {access.hasAccess ? "Açık" : "Kapalı"}
            {access.status
              ? ` · ${subscriptionStatusText(
                  access.status,
                  subscription?.currentPeriodEnd,
                  STATUS_LABELS[access.status],
                )}`
              : ""}
          </p>
          <p>
            Personel: {access.usage.staff}
            {access.limits.maxStaff != null
              ? ` / ${access.limits.maxStaff}`
              : " / sınırsız"}
          </p>
          <p>
            Müşteri: {access.usage.customers}
            {access.limits.maxCustomers != null
              ? ` / ${access.limits.maxCustomers}`
              : " / sınırsız"}
          </p>
        </div>
        {readOnly ? (
          <p className="mt-4 text-sm text-[#5a7380]">
            {role === "ACCOUNTANT"
              ? "Muhasebe rolü Planio aboneliğini yalnızca görüntüleyebilir. Yenileme işletme sahibine aittir."
              : "Personel abonelik bilgilerini yalnızca görüntüleyebilir."}
          </p>
        ) : canCancel ? (
          <button
            type="button"
            className={`${btnOutline} mt-4`}
            disabled={cancel.isPending}
            onClick={() => setConfirmCancel(true)}
          >
            {cancel.isPending ? "İptal ediliyor…" : "Aboneliği iptal et"}
          </button>
        ) : null}
        {message ? (
          <p role="status" className="mt-3 text-sm text-[#5a7380]">
            {message}
          </p>
        ) : null}
      </div>
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
  const [distanceSalesAccepted, setDistanceSalesAccepted] = useState(false);
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
    <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
      <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
        <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
          Kullanılabilir planlar
        </h2>
      </div>
      <div className="grid gap-3 p-5">
        {plans.map((plan) => {
          const selected =
            current?.status === "ACTIVE" && current.plan.id === plan.id;
          const isChosen = selectedPlanId === plan.id;
          return (
            <div
              key={plan.id}
              className={`rounded-xl px-4 py-4 ring-1 ${
                isChosen
                  ? "bg-[#eef6f8] ring-[#7eb8c8]"
                  : "bg-[#F7FBFC] ring-[#e4f0f4]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[15px] font-semibold text-[#1e3340]">
                  {plan.name} · {PERIOD_LABELS[plan.billingPeriod]}
                </p>
                <p className="text-[15px] font-semibold text-[#2f5563]">
                  {formatPrice(plan)}
                </p>
              </div>
              {readOnly ? null : (
                <button
                  type="button"
                  className={`mt-3 ${selected || isChosen ? btnPrimary : btnOutline}`}
                  disabled={selected}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  {selected ? "Mevcut plan" : isChosen ? "Seçildi" : "Planı seç"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {readOnly || !selectedPlan ? null : (
        <form
          className="border-t border-[#e4f0f4] p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handlePay();
          }}
        >
          <h3 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
            Ödeme bilgileri
          </h3>
          <p className="mt-1 text-[13px] text-[#5a7380]">
            Kart numarası ve CVV bu forma girilmez. iyzico formu kartı kendi
            sayfasında alır.
          </p>
          <div className="mt-4 grid gap-4">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              T.C. kimlik no
              <input
                required
                minLength={5}
                value={identityNumber}
                onChange={(event) => setIdentityNumber(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              GSM
              <input
                required
                aria-label="GSM"
                placeholder="+905551112233"
                value={gsmNumber}
                onChange={(event) => setGsmNumber(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Adres
              <input
                required
                minLength={3}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Şehir
              <input
                required
                minLength={2}
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="flex items-start gap-2.5 text-[13px] leading-5 text-[#5a7380]">
              <input
                type="checkbox"
                required
                aria-label="Mesafeli satış sözleşmesini kabul ediyorum"
                checked={distanceSalesAccepted}
                onChange={(event) =>
                  setDistanceSalesAccepted(event.target.checked)
                }
                className="mt-0.5 h-4 w-4 rounded border-[#c5dde6] text-[#7eb8c8] accent-[#7eb8c8]"
              />
              <span>
                <Link
                  href="/mesafeli-satis-sozlesmesi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#3d6b7a] underline-offset-2 hover:underline"
                >
                  Mesafeli satış sözleşmesi
                </Link>
                ni okudum ve kabul ediyorum.
              </span>
            </label>
            <div>
              <button
                type="submit"
                disabled={checkout.isPending || !distanceSalesAccepted}
                className={btnPrimary}
              >
                {checkout.isPending ? "Ödeme başlatılıyor…" : "iyzico ile öde"}
              </button>
              <div
                className="mt-3 flex items-center gap-3"
                aria-label="Kabul edilen kartlar"
              >
                <VisaLogo />
                <MastercardLogo />
              </div>
            </div>
          </div>
        </form>
      )}
      {message ? (
        <p role="status" className="px-5 pb-5 text-sm text-[#5a7380]">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function VisaLogo() {
  return (
    <svg
      role="img"
      aria-label="Visa"
      width="52"
      height="32"
      viewBox="0 0 52 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="52" height="32" rx="6" fill="#F7FBFC" stroke="#c5dde6" />
      <text
        x="26"
        y="20.5"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="12"
        fontWeight="700"
        fontStyle="italic"
        fill="#1a1f71"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardLogo() {
  return (
    <svg
      role="img"
      aria-label="Mastercard"
      width="52"
      height="32"
      viewBox="0 0 52 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="52" height="32" rx="6" fill="#F7FBFC" stroke="#c5dde6" />
      <circle cx="22" cy="16" r="7.5" fill="#eb001b" />
      <circle cx="30" cy="16" r="7.5" fill="#f79e1b" />
      <path
        d="M26 10.2a7.5 7.5 0 0 1 0 11.6 7.5 7.5 0 0 1 0-11.6z"
        fill="#ff5f00"
      />
    </svg>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-[#1e3340]">{value}</dd>
    </div>
  );
}
