import { z } from "zod";
import type {
  BusinessProfile,
  InviteAccountantInput,
  UpdateBusinessInput,
} from "@xenior/types";

const nullableTrimmedString = (maximum: number) =>
  z.string().trim().max(maximum).nullable();

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{6,14}$/, "Phone must be a valid international number.");

export const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((timezone) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
      return true;
    } catch {
      return false;
    }
  }, "Timezone must be a valid IANA timezone.");

export const currencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "Currency must be a three-letter ISO 4217 code.");

export const businessProfileSchema: z.ZodType<BusinessProfile> = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  timezone: z.string(),
  currency: z.string(),
  status: z.enum(["ACTIVE", "SUSPENDED", "CLOSED"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const updateBusinessInputSchema: z.ZodType<UpdateBusinessInput> = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    phone: phoneSchema.nullable().optional(),
    email: z.string().trim().email().max(320).nullable().optional(),
    address: nullableTrimmedString(5000).optional(),
    timezone: timezoneSchema.optional(),
    currency: currencySchema.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one business field must be provided.",
  });

export const inviteAccountantInputSchema: z.ZodType<InviteAccountantInput> = z
  .object({
    email: z.string().trim().toLowerCase().email().max(320),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
  })
  .strict();
