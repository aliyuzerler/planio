import { Inject, Injectable } from "@nestjs/common";
import type { NotificationChannel } from "@xenior/types";
import { NOTIFICATION_PROVIDERS } from "../notification.constants";
import type { NotificationProvider } from "./notification-provider";

@Injectable()
export class NotificationProviderRegistry {
  private readonly byChannel: Map<NotificationChannel, NotificationProvider>;

  constructor(
    @Inject(NOTIFICATION_PROVIDERS)
    providers: NotificationProvider[],
  ) {
    this.byChannel = new Map(providers.map((provider) => [provider.channel, provider]));
  }

  get(channel: NotificationChannel): NotificationProvider {
    const provider = this.byChannel.get(channel);
    if (!provider) {
      throw new Error(`No notification provider registered for ${channel}.`);
    }
    return provider;
  }
}
