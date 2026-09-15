export type BillingPeriod = "MONTHLY" | "SEMIANNUAL" | "YEARLY";

export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "PAUSED"
  | "CANCELLED"
  | "EXPIRED";

export interface PlanLimits {
  maxStaff?: number | null;
  maxCustomers?: number | null;
  advancedFeatures?: boolean;
}

export interface PlanRecord {
  id: string;
  name: string;
  billingPeriod: BillingPeriod;
  price: string;
  currency: string;
  isActive: boolean;
  limits: PlanLimits;
  externalPricingPlanCode?: string | null;
}

export interface SubscriptionRecord {
  id: string;
  businessId: string;
  status: SubscriptionStatus;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  cancelAtPeriodEnd: boolean;
  externalProvider: "IYZICO" | null;
  externalSubscriptionId: string | null;
  plan: PlanRecord;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionUsage {
  staff: number;
  customers: number;
}

export interface SubscriptionAccess {
  hasAccess: boolean;
  status: SubscriptionStatus | null;
  plan: PlanRecord | null;
  limits: PlanLimits;
  usage: SubscriptionUsage;
}

export interface SelectSubscriptionPlanInput {
  planId: string;
}

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export interface PaymentBillingAddress {
  address: string;
  city: string;
  country: string;
  zipCode?: string;
  contactName?: string;
}

export interface CreatePaymentCheckoutInput {
  planId: string;
  identityNumber: string;
  gsmNumber: string;
  billingAddress: PaymentBillingAddress;
}

export interface PaymentRecord {
  id: string;
  businessId: string;
  subscriptionId: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  provider: "IYZICO";
  externalPaymentId: string | null;
  externalReference: string | null;
  paidAt: string | null;
  failedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentCheckoutSession {
  payment: PaymentRecord;
  subscription: SubscriptionRecord;
  checkout: {
    token: string;
    paymentPageUrl: string | null;
    tokenExpireTime: number | null;
  };
}
