import { z } from "zod";
import type {
  AdminAuditLogItem,
  AdminBusinessDetail,
  AdminBusinessListItem,
  AdminBusinessUser,
  AdminDashboardMetrics,
  AdminPaymentSummary,
  AdminSubscriptionSummary,
  CreateAdminPlanInput,
  PaginatedAdminAuditLogs,
  PaginatedAdminBusinesses,
  PaginatedAdminSubscriptions,
  UpdateAdminBusinessStatusInput,
  UpdateAdminPlanInput,
} from "@xenior/types";
import {
  billingPeriodSchema,
  planLimitsSchema,
  planRecordSchema,
  paymentStatusSchema,
  subscriptionStatusSchema,
} from "./subscription";
import { servicePriceSchema } from "./service";
import { businessUserRoleSchema } from "./auth";

export const businessStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "CLOSED"]);

export const updateAdminBusinessStatusInputSchema: z.ZodType<UpdateAdminBusinessStatusInput> =
  z.object({
    status: businessStatusSchema,
  });

export const createAdminPlanInputSchema: z.ZodType<CreateAdminPlanInput> = z.object({
  name: z.string().trim().min(1).max(120),
  billingPeriod: billingPeriodSchema,
  price: servicePriceSchema,
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  isActive: z.boolean().optional(),
  limits: planLimitsSchema.optional(),
  externalPricingPlanCode: z.string().trim().max(191).nullable().optional(),
});

export const updateAdminPlanInputSchema: z.ZodType<UpdateAdminPlanInput> = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  billingPeriod: billingPeriodSchema.optional(),
  price: servicePriceSchema.optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  isActive: z.boolean().optional(),
  limits: planLimitsSchema.optional(),
  externalPricingPlanCode: z.string().trim().max(191).nullable().optional(),
});

const adminPaymentSummarySchema: z.ZodType<AdminPaymentSummary> = z.object({
  id: z.string().uuid(),
  status: paymentStatusSchema,
  amount: z.string(),
  currency: z.string(),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
});

export const adminSubscriptionSummarySchema: z.ZodType<AdminSubscriptionSummary> =
  z.object({
    id: z.string().uuid(),
    businessId: z.string().uuid(),
    businessName: z.string(),
    status: subscriptionStatusSchema,
    startedAt: z.string(),
    currentPeriodStart: z.string(),
    currentPeriodEnd: z.string(),
    cancelledAt: z.string().nullable(),
    cancelAtPeriodEnd: z.boolean(),
    billingPeriod: billingPeriodSchema,
    plan: planRecordSchema,
    lastPayment: adminPaymentSummarySchema.nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  });

export const adminBusinessUserSchema: z.ZodType<AdminBusinessUser> = z.object({
  membershipId: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  role: businessUserRoleSchema,
  isActive: z.boolean(),
  platformRole: z.enum(["USER", "SUPER_ADMIN"]),
});

export const adminBusinessListItemSchema: z.ZodType<AdminBusinessListItem> =
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    timezone: z.string(),
    currency: z.string(),
    status: businessStatusSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
    subscription: adminSubscriptionSummarySchema.nullable(),
  });

export const adminBusinessDetailSchema: z.ZodType<AdminBusinessDetail> =
  adminBusinessListItemSchema.and(
    z.object({
      address: z.string().nullable(),
      users: z.array(adminBusinessUserSchema),
    }),
  );

export const adminDashboardMetricsSchema: z.ZodType<AdminDashboardMetrics> =
  z.object({
    businesses: z.object({
      total: z.number().int().nonnegative(),
      ACTIVE: z.number().int().nonnegative(),
      SUSPENDED: z.number().int().nonnegative(),
      CLOSED: z.number().int().nonnegative(),
    }),
    subscriptions: z.object({
      total: z.number().int().nonnegative(),
      TRIALING: z.number().int().nonnegative(),
      ACTIVE: z.number().int().nonnegative(),
      PAST_DUE: z.number().int().nonnegative(),
      PAUSED: z.number().int().nonnegative(),
      CANCELLED: z.number().int().nonnegative(),
      EXPIRED: z.number().int().nonnegative(),
    }),
    licenses: z.object({
      total: z.number().int().nonnegative(),
      MONTHLY: z.number().int().nonnegative(),
      SEMIANNUAL: z.number().int().nonnegative(),
      YEARLY: z.number().int().nonnegative(),
    }),
    users: z.object({
      total: z.number().int().nonnegative(),
    }),
    payments: z.object({
      total: z.number().int().nonnegative(),
      PENDING: z.number().int().nonnegative(),
      PROCESSING: z.number().int().nonnegative(),
      SUCCEEDED: z.number().int().nonnegative(),
      FAILED: z.number().int().nonnegative(),
      CANCELLED: z.number().int().nonnegative(),
      REFUNDED: z.number().int().nonnegative(),
      PARTIALLY_REFUNDED: z.number().int().nonnegative(),
    }),
  });

export const adminAuditLogItemSchema: z.ZodType<AdminAuditLogItem> = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  businessName: z.string(),
  userId: z.string().uuid().nullable(),
  userEmail: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  metadata: z.unknown().optional(),
  createdAt: z.string(),
});

const pageFields = {
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasMore: z.boolean(),
};

export const paginatedAdminBusinessesSchema: z.ZodType<PaginatedAdminBusinesses> =
  z.object({
    items: z.array(adminBusinessListItemSchema),
    ...pageFields,
  });

export const paginatedAdminSubscriptionsSchema: z.ZodType<PaginatedAdminSubscriptions> =
  z.object({
    items: z.array(adminSubscriptionSummarySchema),
    ...pageFields,
  });

export const paginatedAdminAuditLogsSchema: z.ZodType<PaginatedAdminAuditLogs> =
  z.object({
    items: z.array(adminAuditLogItemSchema),
    ...pageFields,
  });
