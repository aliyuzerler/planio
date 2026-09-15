import { z } from "zod";
import type {
  BroadcastSmsInput,
  BroadcastSmsResult,
  IssueOfficialDocumentInput,
  OfficialDocumentRecord,
  TenantUyumsoftSettingsRecord,
  UpsertTenantUyumsoftSettingsInput,
} from "@xenior/types";

export const officialDocumentTypeSchema = z.enum(["E_FATURA", "SMM"]);
export const officialDocumentStatusSchema = z.enum(["PENDING", "ISSUED", "FAILED"]);
export const uyumsoftProviderSchema = z.enum(["GENERIC", "UYUMSOFT"]);

export const tenantUyumsoftSettingsRecordSchema: z.ZodType<TenantUyumsoftSettingsRecord> =
  z.object({
    provider: uyumsoftProviderSchema,
    isActive: z.boolean(),
    hasCredentials: z.boolean(),
    updatedAt: z.string().datetime(),
  });

export const upsertTenantUyumsoftSettingsInputSchema: z.ZodType<UpsertTenantUyumsoftSettingsInput> =
  z
    .object({
      provider: uyumsoftProviderSchema,
      isActive: z.boolean().optional(),
      username: z.string().trim().min(1).max(200).optional(),
      password: z.string().trim().min(1).max(200).optional(),
    })
    .strict();

export const officialDocumentRecordSchema: z.ZodType<OfficialDocumentRecord> =
  z.object({
    id: z.string().uuid(),
    saleId: z.string().uuid(),
    type: officialDocumentTypeSchema,
    status: officialDocumentStatusSchema,
    documentNo: z.string().nullable(),
    pdfUrl: z.string().nullable(),
    errorCode: z.string().nullable(),
    errorMessage: z.string().nullable(),
    cancelPolicy: z.string(),
    issuedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

export const issueOfficialDocumentInputSchema: z.ZodType<IssueOfficialDocumentInput> =
  z
    .object({
      type: officialDocumentTypeSchema,
    })
    .strict();

export const broadcastSmsInputSchema: z.ZodType<BroadcastSmsInput> = z
  .object({
    body: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

export const broadcastSmsResultSchema: z.ZodType<BroadcastSmsResult> = z.object({
  queued: z.number().int().nonnegative(),
  skippedNoConsent: z.number().int().nonnegative(),
  skippedNoPhone: z.number().int().nonnegative(),
  skippedOverLimit: z.number().int().nonnegative(),
  body: z.string(),
});
