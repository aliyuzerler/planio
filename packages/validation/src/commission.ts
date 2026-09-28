import { z } from "zod";
import type {
  CommissionEntryRecord,
  CommissionRuleRecord,
  CreateCommissionRuleInput,
  ListCommissionEntriesQuery,
  PaginatedResponse,
  UpdateCommissionRuleInput,
} from "@xenior/types";
import { servicePriceSchema } from "./service";

export const commissionTypeSchema = z.enum(["PERCENT", "AMOUNT"]);
export const commissionSourceTypeSchema = z.enum(["APPOINTMENT"]);

function refinePercent(
  type: "PERCENT" | "AMOUNT" | undefined,
  value: string | undefined,
  context: z.RefinementCtx,
): void {
  if (type === "PERCENT" && value && Number(value) > 100) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["commissionValue"],
      message: "Percent commission cannot exceed 100.00.",
    });
  }
}

export const commissionRuleRecordSchema: z.ZodType<CommissionRuleRecord> =
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    serviceId: z.string().uuid().nullable(),
    commissionType: commissionTypeSchema,
    commissionValue: servicePriceSchema,
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

export const createCommissionRuleInputSchema: z.ZodType<CreateCommissionRuleInput> =
  z
    .object({
      name: z.string().trim().min(1).max(160),
      commissionType: commissionTypeSchema,
      commissionValue: servicePriceSchema,
      serviceId: z.string().uuid().nullable().optional(),
      isActive: z.boolean().optional(),
    })
    .strict()
    .superRefine((input, context) =>
      refinePercent(input.commissionType, input.commissionValue, context),
    );

export const updateCommissionRuleInputSchema: z.ZodType<UpdateCommissionRuleInput> =
  z
    .object({
      name: z.string().trim().min(1).max(160).optional(),
      commissionType: commissionTypeSchema.optional(),
      commissionValue: servicePriceSchema.optional(),
      serviceId: z.string().uuid().nullable().optional(),
      isActive: z.boolean().optional(),
    })
    .strict()
    .refine((input) => Object.keys(input).length > 0, {
      message: "At least one commission rule field must be provided.",
    })
    .superRefine((input, context) =>
      refinePercent(input.commissionType, input.commissionValue, context),
    );

export const commissionEntryRecordSchema: z.ZodType<CommissionEntryRecord> =
  z.object({
    id: z.string().uuid(),
    staff: z.object({
      id: z.string().uuid(),
      firstName: z.string(),
      lastName: z.string(),
    }),
    appointmentId: z.string().uuid().nullable(),
    ruleId: z.string().uuid().nullable(),
    sourceType: commissionSourceTypeSchema,
    sourceId: z.string().uuid(),
    staffNameSnapshot: z.string(),
    serviceNameSnapshot: z.string(),
    ruleNameSnapshot: z.string(),
    basisAmount: servicePriceSchema,
    commissionType: commissionTypeSchema,
    commissionValue: servicePriceSchema,
    amount: servicePriceSchema,
    currency: z.string().regex(/^[A-Z]{3}$/),
    earnedAt: z.string().datetime(),
    createdAt: z.string().datetime(),
    payoutExpenseId: z.string().uuid().nullable(),
  });

export const paginatedCommissionEntrySchema: z.ZodType<
  PaginatedResponse<CommissionEntryRecord>
> = z.object({
  items: z.array(commissionEntryRecordSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export const listCommissionEntriesQuerySchema: z.ZodType<ListCommissionEntriesQuery> =
  z.object({
    staffId: z.string().uuid().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(100).optional(),
  });
