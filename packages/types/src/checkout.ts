export type TenantPosProvider = "GENERIC" | "IYZICO";
export type CheckoutPurpose = "DEPOSIT" | "FULL" | "REMAINING";
export type CheckoutIntentStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";

export interface TenantPaymentSettingsRecord {
  provider: TenantPosProvider;
  isActive: boolean;
  hasCredentials: boolean;
  updatedAt: string;
}

export interface UpsertTenantPaymentSettingsInput {
  provider: TenantPosProvider;
  isActive?: boolean;
  apiKey?: string;
  secretKey?: string;
}

export interface PaymentLinkRecord {
  url: string;
  token: string;
  amount: string;
  currency: string;
  purpose: CheckoutPurpose;
  expiresAt: string;
}

export interface PublicCheckoutRecord {
  token: string;
  businessName: string;
  serviceName: string;
  customerFirstName: string;
  amount: string;
  currency: string;
  purpose: CheckoutPurpose;
  status: CheckoutIntentStatus;
  expiresAt: string;
}
