import { z } from "zod";
import type {
  AppointmentEventItem,
  AppointmentRecord,
  CreateAppointmentInput,
  ListAppointmentsQuery,
  RescheduleAppointmentInput,
  UpdateAppointmentInput,
} from "@xenior/types";
import type { PaginatedResponse } from "@xenior/types";
import { servicePriceSchema } from "./service";

export const appointmentStatusSchema = z.enum([
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const appointmentEventTypeSchema = z.enum([
  "CREATED",
  "RESCHEDULED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
]);

export const appointmentPaymentPlanSchema = z.enum([
  "DEPOSIT",
  "FULL",
  "ON_DAY",
]);

export const appointmentPaymentStatusSchema = z.enum([
  "UNPAID",
  "PARTIAL",
  "PAID",
]);

export const appointmentStartAtSchema = z
  .string()
  .trim()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/,
    "startAt must be an ISO-8601 date-time.",
  );

const partySchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
});

export const appointmentEventItemSchema: z.ZodType<AppointmentEventItem> =
  z.object({
    id: z.string().uuid(),
    type: appointmentEventTypeSchema,
    previousStartAt: z.string().datetime().nullable(),
    previousEndAt: z.string().datetime().nullable(),
    newStartAt: z.string().datetime().nullable(),
    newEndAt: z.string().datetime().nullable(),
    previousStatus: appointmentStatusSchema.nullable(),
    newStatus: appointmentStatusSchema.nullable(),
    createdAt: z.string().datetime(),
  });

export const appointmentRecordSchema: z.ZodType<AppointmentRecord> = z.object({
  id: z.string().uuid(),
  customer: partySchema,
  staff: partySchema,
  service: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
  resource: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: appointmentStatusSchema,
  notes: z.string().nullable(),
  createdByUserId: z.string().uuid(),
  serviceNameSnapshot: z.string(),
  serviceDurationSnapshot: z.number().int().positive(),
  servicePriceSnapshot: z.string().regex(/^\d{1,10}\.\d{2}$/),
  listPriceSnapshot: z.string().regex(/^\d{1,10}\.\d{2}$/),
  discountAmountSnapshot: z.string().regex(/^\d{1,10}\.\d{2}$/),
  campaignId: z.string().uuid().nullable(),
  campaignNameSnapshot: z.string().nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  paymentPlan: appointmentPaymentPlanSchema,
  depositAmount: servicePriceSchema.nullable(),
  paymentStatus: appointmentPaymentStatusSchema,
  collectedAmount: servicePriceSchema,
  remainingAmount: servicePriceSchema,
  saleId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  events: z.array(appointmentEventItemSchema).optional(),
});

export const createAppointmentInputSchema: z.ZodType<CreateAppointmentInput> = z
  .object({
    customerId: z.string().uuid(),
    staffId: z.string().uuid(),
    serviceId: z.string().uuid(),
    startAt: appointmentStartAtSchema,
    notes: z.string().trim().max(5000).nullable().optional(),
    resourceId: z.string().uuid().nullable().optional(),
    paymentPlan: appointmentPaymentPlanSchema.optional(),
    depositAmount: servicePriceSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.paymentPlan !== "DEPOSIT" ||
      (input.depositAmount != null && input.depositAmount !== "0.00"),
    {
      message: "Kapora ödeme planı için kapora tutarı zorunludur.",
      path: ["depositAmount"],
    },
  );

export const updateAppointmentInputSchema: z.ZodType<UpdateAppointmentInput> = z
  .object({
    notes: z.string().trim().max(5000).nullable().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "En az bir randevu alanı girilmelidir.",
  });

export const rescheduleAppointmentInputSchema: z.ZodType<RescheduleAppointmentInput> =
  z
    .object({
      customerId: z.string().uuid().optional(),
      staffId: z.string().uuid().optional(),
      serviceId: z.string().uuid().optional(),
      startAt: appointmentStartAtSchema.optional(),
      resourceId: z.string().uuid().nullable().optional(),
    })
    .strict()
    .refine(
      (input) =>
        input.customerId !== undefined ||
        input.staffId !== undefined ||
        input.serviceId !== undefined ||
        input.startAt !== undefined ||
        input.resourceId !== undefined,
      { message: "En az bir yeniden planlama alanı girilmelidir." },
    );

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const listAppointmentsQuerySchema: z.ZodType<ListAppointmentsQuery> =
  z.object({
    date: calendarDateSchema.optional(),
    from: calendarDateSchema.optional(),
    to: calendarDateSchema.optional(),
    staffId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    status: appointmentStatusSchema.optional(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(100).optional(),
  });

export const paginatedAppointmentSchema: z.ZodType<
  PaginatedResponse<AppointmentRecord>
> = z.object({
  items: z.array(appointmentRecordSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});
