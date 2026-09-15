import type { NotificationChannel } from "@xenior/types";
import {
  InvalidNotificationError,
  NotificationProviderError,
} from "../notification-errors";
import type {
  NotificationProvider,
  NotificationProviderMessage,
  NotificationProviderResult,
} from "./notification-provider";

const FAIL_DESTINATIONS = new Set([
  "fail",
  "+900000000000",
  "provider-fail",
]);

export class MockNotificationProvider implements NotificationProvider {
  constructor(
    readonly channel: NotificationChannel,
    readonly name = `mock-${channel.toLowerCase()}`,
  ) {}

  async send(
    message: NotificationProviderMessage,
  ): Promise<NotificationProviderResult> {
    const destination = message.destination?.trim() ?? "";
    if (!destination) {
      throw new InvalidNotificationError(
        "Notification destination is required.",
        "MISSING_DESTINATION",
      );
    }
    if (FAIL_DESTINATIONS.has(destination) || destination.startsWith("fail:")) {
      throw new NotificationProviderError(
        `${this.name} rejected destination ${destination}.`,
      );
    }
    return {
      provider: this.name,
      providerMessageId: `${this.name}-${message.notificationId}`,
    };
  }
}

export function defaultMockProviders(): NotificationProvider[] {
  return [
    new MockNotificationProvider("SMS"),
    new MockNotificationProvider("WHATSAPP"),
    new MockNotificationProvider("PUSH"),
    new MockNotificationProvider("EMAIL"),
  ];
}
