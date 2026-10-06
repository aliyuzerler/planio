import { z } from "zod";
import type {
  CreateCustomerInput,
  CustomerAppointmentHistoryItem,
  CustomerProfile,
  PaginatedResponse,
  UpdateCustomerInput,
} from "@xenior/types";
import { phoneSchema } from "./business";
import { servicePriceSchema } from "./service";

function isValidBirthDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10)
  );
}

export const customerBirthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    isValidBirthDate,
    "Doğum tarihi geçerli ve gelecekte olmayan bir tarih olmalıdır.",
  );

export const customerProfileSchema: z.ZodType<CustomerProfile> = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  birthDate: z.string().nullable(),
  notes: z.string().nullable(),
  smsConsent: z.boolean(),
  whatsappConsent: z.boolean(),
  emailConsent: z.boolean(),
  ledgerBalance: servicePriceSchema,
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const customerAppointmentHistoryItemSchema: z.ZodType<CustomerAppointmentHistoryItem> =
  z.object({
    id: z.string().uuid(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
    serviceNameSnapshot: z.string(),
    serviceDurationSnapshot: z.number().int().positive(),
    servicePriceSnapshot: z.string().regex(/^\d{1,10}\.\d{2}$/),
    currency: z.string().regex(/^[A-Z]{3}$/),
    staff: z.object({
      id: z.string().uuid(),
      firstName: z.string(),
      lastName: z.string(),
    }),
  });

export const createCustomerInputSchema: z.ZodType<CreateCustomerInput> = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    phone: phoneSchema.nullable().optional(),
    email: z.string().trim().email().max(320).nullable().optional(),
    birthDate: customerBirthDateSchema.nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    smsConsent: z.boolean().optional(),
    whatsappConsent: z.boolean().optional(),
    emailConsent: z.boolean().optional(),
  })
  .strict();

export const updateCustomerInputSchema: z.ZodType<UpdateCustomerInput> = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    phone: phoneSchema.nullable().optional(),
    email: z.string().trim().email().max(320).nullable().optional(),
    birthDate: customerBirthDateSchema.nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    smsConsent: z.boolean().optional(),
    whatsappConsent: z.boolean().optional(),
    emailConsent: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "En az bir müşteri alanı girilmelidir.",
  });

export const paginatedCustomerSchema: z.ZodType<
  PaginatedResponse<CustomerProfile>
> = z.object({
  items: z.array(customerProfileSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export const paginatedCustomerAppointmentHistorySchema: z.ZodType<
  PaginatedResponse<CustomerAppointmentHistoryItem>
> = z.object({
  items: z.array(customerAppointmentHistoryItemSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export const customerFileKindSchema = z.enum(["KVKK", "SIGNED_FORM", "OTHER"]);

export const customerFileRecordSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  kind: customerFileKindSchema,
  originalName: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export const customerFileListSchema = z.array(customerFileRecordSchema);
