import { z } from "zod";
import type {
  PaymentLinkRecord,
  PublicCheckoutRecord,
  TenantPaymentSettingsRecord,
  UpsertTenantPaymentSettingsInput,
} from "@xenior/types";
import { servicePriceSchema } from "./service";

export const tenantPosProviderSchema = z.enum(["GENERIC", "IYZICO"]);
export const checkoutPurposeSchema = z.enum(["DEPOSIT", "FULL", "REMAINING"]);
export const checkoutIntentStatusSchema = z.enum([
  "PENDING",
  "PAID",
  "EXPIRED",
  "CANCELLED",
]);

export const tenantPaymentSettingsRecordSchema: z.ZodType<TenantPaymentSettingsRecord> =
  z.object({
    provider: tenantPosProviderSchema,
    isActive: z.boolean(),
    hasCredentials: z.boolean(),
    updatedAt: z.string().datetime(),
  });

export const upsertTenantPaymentSettingsInputSchema: z.ZodType<UpsertTenantPaymentSettingsInput> =
  z
    .object({
      provider: tenantPosProviderSchema,
      isActive: z.boolean().optional(),
      apiKey: z.string().trim().min(1).max(200).optional(),
      secretKey: z.string().trim().min(1).max(200).optional(),
    })
    .strict();

export const paymentLinkRecordSchema: z.ZodType<PaymentLinkRecord> = z.object({
  url: z.string().url(),
  token: z.string().min(8),
  amount: servicePriceSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  purpose: checkoutPurposeSchema,
  expiresAt: z.string().datetime(),
});

export const publicCheckoutRecordSchema: z.ZodType<PublicCheckoutRecord> =
  z.object({
    token: z.string().min(8),
    businessName: z.string(),
    serviceName: z.string(),
    customerFirstName: z.string(),
    amount: servicePriceSchema,
    currency: z.string().regex(/^[A-Z]{3}$/),
    purpose: checkoutPurposeSchema,
    status: checkoutIntentStatusSchema,
    expiresAt: z.string().datetime(),
  });
