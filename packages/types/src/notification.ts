export type NotificationType =
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_REMINDER"
  | "APPOINTMENT_RESCHEDULED"
  | "APPOINTMENT_CANCELLED"
  | "SUBSCRIPTION"
  | "CUSTOM";

export type NotificationChannel = "SMS" | "WHATSAPP" | "PUSH" | "EMAIL";

export type NotificationStatus =
  | "PENDING"
  | "SCHEDULED"
  | "PROCESSING"
  | "SENT"
  | "FAILED"
  | "CANCELLED";

export type PushPlatform = "IOS" | "ANDROID" | "WEB";

export type NotificationProviderName =
  | "netgsm"
  | "meta-whatsapp"
  | "smtp"
  | "fcm"
  | "mock";

export interface NotificationSettings {
  businessId: string;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  notifyOnCreated: boolean;
  notifyOnRescheduled: boolean;
  notifyOnCancelled: boolean;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  updatedAt: string;
}

export interface UpdateNotificationSettingsInput {
  smsEnabled?: boolean;
  whatsappEnabled?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  notifyOnCreated?: boolean;
  notifyOnRescheduled?: boolean;
  notifyOnCancelled?: boolean;
  reminderEnabled?: boolean;
  reminderMinutesBefore?: number;
}

export interface NotificationRecord {
  id: string;
  businessId: string;
  appointmentId: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  destination: string | null;
  subject: string | null;
  body: string;
  provider: string | null;
  attemptCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  lastAttemptAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListNotificationsQuery {
  status?: NotificationStatus;
  type?: NotificationType;
  channel?: NotificationChannel;
  page?: number;
  pageSize?: number;
}

export interface RegisterPushDeviceInput {
  token: string;
  platform: PushPlatform;
}

export interface PushDeviceRecord {
  id: string;
  token: string;
  platform: PushPlatform;
  isActive: boolean;
  lastSeenAt: string;
  createdAt: string;
}

export interface NotificationChannelSetup {
  channel: NotificationChannel;
  provider: NotificationProviderName | null;
  configured: boolean;
  lastTestedAt: string | null;
  lastTestError: string | null;
  hint: string | null;
}

export interface UpsertNotificationChannelInput {
  channel: NotificationChannel;
  usercode?: string;
  password?: string;
  msgheader?: string;
  accessToken?: string;
  phoneNumberId?: string;
  templateName?: string;
  host?: string;
  port?: number;
  username?: string;
  fromEmail?: string;
  secure?: boolean;
}

export interface TestNotificationChannelInput {
  channel: NotificationChannel;
  destination: string;
}

export interface WeeklyHoursSlot {
  weekday: number;
  startMinutes: number;
  endMinutes: number;
  isClosed: boolean;
}

export interface BusinessHoursSettings {
  hoursEnforced: boolean;
  days: WeeklyHoursSlot[];
}

export interface UpdateBusinessHoursInput {
  hoursEnforced: boolean;
  days: WeeklyHoursSlot[];
}

export interface DataExportRecord {
  business: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  customers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  }>;
  appointments: Array<{
    id: string;
    startAt: string;
    status: string;
    serviceNameSnapshot: string;
  }>;
}

export interface DataRequestRecord {
  id: string;
  type: "EXPORT" | "ERASE";
  status: "PENDING" | "COMPLETED";
  createdAt: string;
  completedAt: string | null;
}
