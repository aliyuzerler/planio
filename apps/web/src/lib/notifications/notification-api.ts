import type {
  NotificationChannelSetup,
  NotificationRecord,
  NotificationSettings,
  PaginatedResponse,
  TestNotificationChannelInput,
  UpdateNotificationSettingsInput,
  UpsertNotificationChannelInput,
} from "@xenior/types";
import {
  notificationChannelSetupSchema,
  notificationSettingsSchema,
  paginatedNotificationSchema,
  testNotificationChannelInputSchema,
  updateNotificationSettingsInputSchema,
  upsertNotificationChannelInputSchema,
} from "@xenior/validation";
import { apiRequest } from "@/lib/api/client";

export async function getNotificationSettings(): Promise<NotificationSettings> {
  return notificationSettingsSchema.parse(
    await apiRequest<unknown>("/notifications/settings"),
  );
}

export async function updateNotificationSettings(
  input: UpdateNotificationSettingsInput,
): Promise<NotificationSettings> {
  return notificationSettingsSchema.parse(
    await apiRequest<unknown>("/notifications/settings", {
      method: "PATCH",
      body: updateNotificationSettingsInputSchema.parse(input),
    }),
  );
}

export async function listNotifications(filters: {
  status?: NotificationRecord["status"];
  page?: number;
  pageSize?: number;
} = {}): Promise<PaginatedResponse<NotificationRecord>> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 25));
  return paginatedNotificationSchema.parse(
    await apiRequest<unknown>(`/notifications?${params.toString()}`),
  );
}

export async function listNotificationSetup(): Promise<NotificationChannelSetup[]> {
  const response = await apiRequest<unknown>("/notifications/setup");
  if (!Array.isArray(response)) {
    throw new Error("Invalid notification setup response.");
  }
  return response.map((item) => notificationChannelSetupSchema.parse(item));
}

export async function upsertNotificationChannel(
  input: UpsertNotificationChannelInput,
): Promise<NotificationChannelSetup[]> {
  const response = await apiRequest<unknown>("/notifications/setup", {
    method: "PATCH",
    body: upsertNotificationChannelInputSchema.parse(input),
  });
  if (!Array.isArray(response)) {
    throw new Error("Invalid notification setup response.");
  }
  return response.map((item) => notificationChannelSetupSchema.parse(item));
}

export async function testNotificationChannel(
  input: TestNotificationChannelInput,
): Promise<NotificationChannelSetup[]> {
  const response = await apiRequest<unknown>("/notifications/setup/test", {
    method: "POST",
    body: testNotificationChannelInputSchema.parse(input),
  });
  if (!Array.isArray(response)) {
    throw new Error("Invalid notification setup response.");
  }
  return response.map((item) => notificationChannelSetupSchema.parse(item));
}
