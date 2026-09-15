import type { NotificationChannel } from "@xenior/types";
import { InvalidNotificationError } from "../notification-errors";
import type {
  NotificationProvider,
  NotificationProviderMessage,
  NotificationProviderResult,
} from "./notification-provider";

export class UnconfiguredNotificationProvider implements NotificationProvider {
  readonly name = "unconfigured";

  constructor(readonly channel: NotificationChannel) {}

  async send(_message: NotificationProviderMessage): Promise<NotificationProviderResult> {
    throw new InvalidNotificationError(
      `${this.channel} provider is not configured.`,
      "PROVIDER_NOT_CONFIGURED",
    );
  }
}
