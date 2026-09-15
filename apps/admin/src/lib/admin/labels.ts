import type {
  BusinessStatus,
  BusinessUserRole,
  PaymentStatus,
  SubscriptionStatus,
} from "@xenior/types";

export const BUSINESS_STATUS_LABELS: Record<BusinessStatus, string> = {
  ACTIVE: "Aktif",
  SUSPENDED: "Askıya alındı",
  CLOSED: "Kapatıldı",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: "Ödeme bekliyor",
  ACTIVE: "Aktif",
  PAST_DUE: "Gecikmiş",
  PAUSED: "Duraklatıldı",
  CANCELLED: "İptal",
  EXPIRED: "Süresi doldu",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Bekliyor",
  PROCESSING: "İşleniyor",
  SUCCEEDED: "Başarılı",
  FAILED: "Başarısız",
  CANCELLED: "İptal",
  REFUNDED: "İade",
  PARTIALLY_REFUNDED: "Kısmi iade",
};

export const ROLE_LABELS: Record<BusinessUserRole, string> = {
  BUSINESS_OWNER: "İşletme sahibi",
  BUSINESS_ADMIN: "İşletme yöneticisi",
  ACCOUNTANT: "Muhasebe",
  STAFF: "Personel",
};

export const BILLING_PERIOD_LABELS = {
  MONTHLY: "Aylık",
  SEMIANNUAL: "6 aylık",
  YEARLY: "Yıllık",
} as const;

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
