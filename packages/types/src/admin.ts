import type { PaginatedResponse } from "./customer";
import type {
  BillingPeriod,
  PaymentStatus,
  PlanLimits,
  PlanRecord,
  SubscriptionStatus,
} from "./subscription";
import type { BusinessUserRole, PlatformRole } from "./auth";

export type BusinessStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";

export interface AdminStatusCount {
  total: number;
  ACTIVE: number;
  SUSPENDED: number;
  CLOSED: number;
}

export interface AdminSubscriptionStatusCount {
  total: number;
  TRIALING: number;
  ACTIVE: number;
  PAST_DUE: number;
  PAUSED: number;
  CANCELLED: number;
  EXPIRED: number;
}

export interface AdminPaymentStatusCount {
  total: number;
  PENDING: number;
  PROCESSING: number;
  SUCCEEDED: number;
  FAILED: number;
  CANCELLED: number;
  REFUNDED: number;
  PARTIALLY_REFUNDED: number;
}

export interface AdminDashboardMetrics {
  businesses: AdminStatusCount;
  subscriptions: AdminSubscriptionStatusCount;
  licenses: {
    total: number;
    MONTHLY: number;
    SEMIANNUAL: number;
    YEARLY: number;
  };
  users: { total: number };
  payments: AdminPaymentStatusCount;
}

export interface AdminPaymentSummary {
  id: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  paidAt: string | null;
  createdAt: string;
}

export interface AdminSubscriptionSummary {
  id: string;
  businessId: string;
  businessName: string;
  status: SubscriptionStatus;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  cancelAtPeriodEnd: boolean;
  billingPeriod: PlanRecord["billingPeriod"];
  plan: PlanRecord;
  lastPayment: AdminPaymentSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBusinessUser {
  membershipId: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: BusinessUserRole;
  isActive: boolean;
  platformRole: PlatformRole;
}

export interface AdminBusinessListItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  timezone: string;
  currency: string;
  status: BusinessStatus;
  createdAt: string;
  updatedAt: string;
  subscription: AdminSubscriptionSummary | null;
}

export interface AdminBusinessDetail extends AdminBusinessListItem {
  address: string | null;
  users: AdminBusinessUser[];
}

export interface CreateAdminPlanInput {
  name: string;
  billingPeriod: BillingPeriod;
  price: string;
  currency?: string;
  isActive?: boolean;
  limits?: PlanLimits;
  externalPricingPlanCode?: string | null;
}

export interface UpdateAdminPlanInput {
  name?: string;
  billingPeriod?: BillingPeriod;
  price?: string;
  currency?: string;
  isActive?: boolean;
  limits?: PlanLimits;
  externalPricingPlanCode?: string | null;
}

export interface UpdateAdminBusinessStatusInput {
  status: BusinessStatus;
}

export interface AdminAuditLogItem {
  id: string;
  businessId: string;
  businessName: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  createdAt: string;
}

export interface ListAdminBusinessesQuery {
  q?: string;
  status?: BusinessStatus;
  page?: number;
  pageSize?: number;
}

export interface ListAdminSubscriptionsQuery {
  businessId?: string;
  status?: SubscriptionStatus;
  page?: number;
  pageSize?: number;
}

export interface ListAdminAuditLogsQuery {
  businessId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export type PaginatedAdminBusinesses = PaginatedResponse<AdminBusinessListItem>;
export type PaginatedAdminSubscriptions = PaginatedResponse<AdminSubscriptionSummary>;
export type PaginatedAdminAuditLogs = PaginatedResponse<AdminAuditLogItem>;
