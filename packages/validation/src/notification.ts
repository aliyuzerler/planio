import { z } from "zod";
import type {
  ListNotificationsQuery,
  NotificationRecord,
  NotificationSettings,
  PaginatedResponse,
  RegisterPushDeviceInput,
  UpdateNotificationSettingsInput,
} from "@xenior/types";

export const notificationTypeSchema = z.enum([
  "APPOINTMENT_CONFIRMED",
  "APPOINTMENT_REMINDER",
  "APPOINTMENT_RESCHEDULED",
  "APPOINTMENT_CANCELLED",
  "SUBSCRIPTION",
  "CUSTOM",
]);

export const notificationChannelSchema = z.enum([
  "SMS",
  "WHATSAPP",
  "PUSH",
  "EMAIL",
]);

export const notificationStatusSchema = z.enum([
  "PENDING",
  "SCHEDULED",
  "PROCESSING",
  "SENT",
  "FAILED",
  "CANCELLED",
]);

export const pushPlatformSchema = z.enum(["IOS", "ANDROID", "WEB"]);

export const notificationSettingsSchema: z.ZodType<NotificationSettings> =
  z.object({
    businessId: z.string().uuid(),
    smsEnabled: z.boolean(),
    whatsappEnabled: z.boolean(),
    emailEnabled: z.boolean(),
    pushEnabled: z.boolean(),
    notifyOnCreated: z.boolean(),
    notifyOnRescheduled: z.boolean(),
    notifyOnCancelled: z.boolean(),
    reminderEnabled: z.boolean(),
    reminderMinutesBefore: z.number().int().min(15).max(10_080),
    updatedAt: z.string(),
  });

export const updateNotificationSettingsInputSchema: z.ZodType<UpdateNotificationSettingsInput> =
  z.object({
    smsEnabled: z.boolean().optional(),
    whatsappEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    notifyOnCreated: z.boolean().optional(),
    notifyOnRescheduled: z.boolean().optional(),
    notifyOnCancelled: z.boolean().optional(),
    reminderEnabled: z.boolean().optional(),
    reminderMinutesBefore: z.number().int().min(15).max(10_080).optional(),
  });

export const notificationRecordSchema: z.ZodType<NotificationRecord> = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  appointmentId: z.string().uuid().nullable(),
  type: notificationTypeSchema,
  channel: notificationChannelSchema,
  status: notificationStatusSchema,
  destination: z.string().nullable(),
  subject: z.string().nullable(),
  body: z.string(),
  provider: z.string().nullable(),
  attemptCount: z.number().int(),
  scheduledAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  lastAttemptAt: z.string().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listNotificationsQuerySchema: z.ZodType<ListNotificationsQuery> =
  z.object({
    status: notificationStatusSchema.optional(),
    type: notificationTypeSchema.optional(),
    channel: notificationChannelSchema.optional(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(100).optional(),
  });

export const paginatedNotificationSchema: z.ZodType<
  PaginatedResponse<NotificationRecord>
> = z.object({
  items: z.array(notificationRecordSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export const registerPushDeviceInputSchema: z.ZodType<RegisterPushDeviceInput> =
  z.object({
    token: z.string().trim().min(8).max(512),
    platform: pushPlatformSchema,
  });

export const upsertNotificationChannelInputSchema = z.object({
  channel: notificationChannelSchema,
  usercode: z.string().trim().min(2).max(80).optional(),
  password: z.string().min(2).max(200).optional(),
  msgheader: z.string().trim().min(1).max(20).optional(),
  accessToken: z.string().min(8).max(4000).optional(),
  phoneNumberId: z.string().trim().min(4).max(80).optional(),
  templateName: z.string().trim().max(120).optional(),
  host: z.string().trim().min(3).max(200).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  username: z.string().trim().max(200).optional(),
  fromEmail: z.string().trim().email().max(320).optional(),
  secure: z.boolean().optional(),
});

export const testNotificationChannelInputSchema = z.object({
  channel: notificationChannelSchema,
  destination: z.string().trim().min(3).max(320),
});

export const weeklyHoursSlotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startMinutes: z.number().int().min(0).max(1440),
  endMinutes: z.number().int().min(0).max(1440),
  isClosed: z.boolean(),
});

export const updateBusinessHoursInputSchema = z.object({
  hoursEnforced: z.boolean(),
  days: z.array(weeklyHoursSlotSchema).length(7),
});

export const businessHoursSettingsSchema = z.object({
  hoursEnforced: z.boolean(),
  days: z.array(weeklyHoursSlotSchema).length(7),
});

export const dataExportRecordSchema = z.object({
  business: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
  }),
  customers: z.array(
    z.object({
      id: z.string().uuid(),
      firstName: z.string(),
      lastName: z.string(),
      phone: z.string().nullable(),
      email: z.string().nullable(),
    }),
  ),
  appointments: z.array(
    z.object({
      id: z.string().uuid(),
      startAt: z.string(),
      status: z.string(),
      serviceNameSnapshot: z.string(),
    }),
  ),
});

export const dataRequestRecordSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["EXPORT", "ERASE"]),
  status: z.enum(["PENDING", "COMPLETED"]),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});

export const notificationChannelSetupSchema = z.object({
  channel: notificationChannelSchema,
  provider: z
    .enum(["netgsm", "meta-whatsapp", "smtp", "fcm", "mock"])
    .nullable(),
  configured: z.boolean(),
  lastTestedAt: z.string().nullable(),
  lastTestError: z.string().nullable(),
  hint: z.string().nullable(),
});
