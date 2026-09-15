import { z } from "zod";
import type {
  CreateServiceInput,
  ServiceProfile,
  UpdateServiceInput,
} from "@xenior/types";

export const servicePriceSchema = z
  .string()
  .regex(
    /^\d{1,10}\.\d{2}$/,
    "Price must be a decimal string with exactly two fractional digits.",
  );

export function normalizeServicePrice(value: string): string | null {
  const trimmed = value.trim();
  const match = /^(\d{1,10})(?:\.(\d{0,2}))?$/.exec(trimmed);
  if (!match) return null;
  return `${match[1]}.${(match[2] ?? "").padEnd(2, "0")}`;
}

export const serviceProfileSchema: z.ZodType<ServiceProfile> = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.number().int().positive(),
  price: servicePriceSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createServiceInputSchema: z.ZodType<CreateServiceInput> = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(5000).nullable().optional(),
    durationMinutes: z.number().int().min(1).max(1440),
    price: servicePriceSchema,
  })
  .strict();

export const updateServiceInputSchema: z.ZodType<UpdateServiceInput> = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    durationMinutes: z.number().int().min(1).max(1440).optional(),
    price: servicePriceSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one service field must be provided.",
  });
