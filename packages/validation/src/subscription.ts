import { z } from "zod";
import type {
  PlanLimits,
  PlanRecord,
  SelectSubscriptionPlanInput,
  SubscriptionAccess,
  SubscriptionRecord,
} from "@xenior/types";
import { servicePriceSchema } from "./service";

export const billingPeriodSchema = z.enum(["MONTHLY", "SEMIANNUAL", "YEARLY"]);

export const subscriptionStatusSchema = z.enum([
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "PAUSED",
  "CANCELLED",
  "EXPIRED",
]);

export const planLimitsSchema: z.ZodType<PlanLimits> = z.object({
  maxStaff: z.number().int().positive().nullable().optional(),
  maxCustomers: z.number().int().positive().nullable().optional(),
  advancedFeatures: z.boolean().optional(),
});

export const planRecordSchema: z.ZodType<PlanRecord> = z.object({
  id: z.string().uuid(),
  name: z.string(),
  billingPeriod: billingPeriodSchema,
  price: servicePriceSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  isActive: z.boolean(),
  limits: planLimitsSchema,
  externalPricingPlanCode: z.string().max(191).nullable().optional(),
});

export const subscriptionRecordSchema: z.ZodType<SubscriptionRecord> = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  status: subscriptionStatusSchema,
  startedAt: z.string(),
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  cancelledAt: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  externalProvider: z.enum(["IYZICO"]).nullable(),
  externalSubscriptionId: z.string().nullable(),
  plan: planRecordSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const subscriptionAccessSchema: z.ZodType<SubscriptionAccess> = z.object({
  hasAccess: z.boolean(),
  status: subscriptionStatusSchema.nullable(),
  plan: planRecordSchema.nullable(),
  limits: planLimitsSchema,
  usage: z.object({
    staff: z.number().int().nonnegative(),
    customers: z.number().int().nonnegative(),
  }),
});

export const selectSubscriptionPlanInputSchema: z.ZodType<SelectSubscriptionPlanInput> =
  z.object({
    planId: z.string().uuid(),
  });

export const paymentStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);

export const paymentBillingAddressSchema = z.object({
  address: z.string().trim().min(3).max(500),
  city: z.string().trim().min(2).max(100),
  country: z.string().trim().min(2).max(100),
  zipCode: z.string().trim().max(20).optional(),
  contactName: z.string().trim().max(120).optional(),
});

export const createPaymentCheckoutInputSchema = z.object({
  planId: z.string().uuid(),
  identityNumber: z.string().trim().min(5).max(20),
  gsmNumber: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/),
  billingAddress: paymentBillingAddressSchema,
});

export const paymentRecordSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  subscriptionId: z.string().uuid(),
  amount: servicePriceSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  status: paymentStatusSchema,
  provider: z.literal("IYZICO"),
  externalPaymentId: z.string().nullable(),
  externalReference: z.string().nullable(),
  paidAt: z.string().nullable(),
  failedAt: z.string().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const paymentCheckoutSessionSchema = z.object({
  payment: paymentRecordSchema,
  subscription: subscriptionRecordSchema,
  checkout: z.object({
    token: z.string(),
    paymentPageUrl: z.string().nullable(),
    tokenExpireTime: z.number().int().nullable(),
  }),
});
