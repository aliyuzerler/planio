import type { NotificationChannel } from "@xenior/types";

export interface NotificationProviderMessage {
  notificationId: string;
  businessId: string;
  channel: NotificationChannel;
  destination: string | null;
  subject: string | null;
  body: string;
  payload?: unknown;
}

export interface NotificationProviderResult {
  provider: string;
  providerMessageId?: string;
}

export interface NotificationProvider {
  readonly name: string;
  readonly channel: NotificationChannel;
  send(
    message: NotificationProviderMessage,
  ): Promise<NotificationProviderResult>;
}
