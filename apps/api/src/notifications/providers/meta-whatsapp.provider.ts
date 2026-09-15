import type { NotificationChannel } from "@xenior/types";
import { normalizeTrMsisdn } from "../phone";
import {
  InvalidNotificationError,
  NotificationProviderError,
} from "../notification-errors";
import type {
  NotificationProvider,
  NotificationProviderMessage,
  NotificationProviderResult,
} from "./notification-provider";

export interface MetaWhatsAppCredentials {
  accessToken: string;
  phoneNumberId: string;
  templateName?: string;
}

export class MetaWhatsAppProvider implements NotificationProvider {
  readonly name = "meta-whatsapp";
  readonly channel: NotificationChannel = "WHATSAPP";

  constructor(private readonly credentials: MetaWhatsAppCredentials) {}

  async send(
    message: NotificationProviderMessage,
  ): Promise<NotificationProviderResult> {
    const msisdn = normalizeTrMsisdn(message.destination);
    if (!msisdn) {
      throw new InvalidNotificationError(
        "WhatsApp destination must be a valid phone number.",
        "MISSING_DESTINATION",
      );
    }
    const url = `https://graph.facebook.com/v21.0/${this.credentials.phoneNumberId}/messages`;
    const body = this.credentials.templateName
      ? {
          messaging_product: "whatsapp",
          to: msisdn,
          type: "template",
          template: {
            name: this.credentials.templateName,
            language: { code: "tr" },
          },
        }
      : {
          messaging_product: "whatsapp",
          to: msisdn,
          type: "text",
          text: { body: message.body.slice(0, 4000) },
        };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.credentials.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new NotificationProviderError(
        payload.error?.message ?? `WhatsApp HTTP ${response.status}`,
      );
    }
    return {
      provider: this.name,
      providerMessageId: payload.messages?.[0]?.id,
    };
  }
}
