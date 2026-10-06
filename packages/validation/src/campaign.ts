import { z } from "zod";
import type {
  CampaignRecord,
  CreateCampaignInput,
  PriceQuote,
  UpdateCampaignInput,
} from "@xenior/types";
import { appointmentStartAtSchema } from "./appointment";
import { servicePriceSchema } from "./service";

export const campaignDiscountTypeSchema = z.enum(["PERCENT", "AMOUNT"]);

export const campaignRecordSchema: z.ZodType<CampaignRecord> = z.object({
  id: z.string().uuid(),
  name: z.string(),
  discountType: campaignDiscountTypeSchema,
  discountValue: servicePriceSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isActive: z.boolean(),
  smsTemplate: z.string().nullable(),
  serviceIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createCampaignInputSchema: z.ZodType<CreateCampaignInput> = z
  .object({
    name: z.string().trim().min(1).max(160),
    discountType: campaignDiscountTypeSchema,
    discountValue: servicePriceSchema,
    startsAt: appointmentStartAtSchema,
    endsAt: appointmentStartAtSchema,
    serviceIds: z.array(z.string().uuid()).optional(),
    smsTemplate: z.string().trim().max(1000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.discountType === "PERCENT" && Number(input.discountValue) > 100) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountValue"],
        message: "Yüzde indirim en fazla 100,00 olabilir.",
      });
    }
  });

export const updateCampaignInputSchema: z.ZodType<UpdateCampaignInput> = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    discountType: campaignDiscountTypeSchema.optional(),
    discountValue: servicePriceSchema.optional(),
    startsAt: appointmentStartAtSchema.optional(),
    endsAt: appointmentStartAtSchema.optional(),
    serviceIds: z.array(z.string().uuid()).optional(),
    smsTemplate: z.string().trim().max(1000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "En az bir kampanya alanı girilmelidir.",
  })
  .superRefine((input, context) => {
    if (
      input.discountType === "PERCENT" &&
      input.discountValue &&
      Number(input.discountValue) > 100
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountValue"],
        message: "Yüzde indirim en fazla 100,00 olabilir.",
      });
    }
  });

export const priceQuoteSchema: z.ZodType<PriceQuote> = z.object({
  serviceId: z.string().uuid(),
  listPrice: servicePriceSchema,
  discountAmount: servicePriceSchema,
  payableAmount: servicePriceSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  campaignId: z.string().uuid().nullable(),
  campaignName: z.string().nullable(),
});
