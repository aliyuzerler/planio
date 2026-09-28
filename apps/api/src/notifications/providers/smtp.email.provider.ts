import { createTransport } from "nodemailer";
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

export interface SmtpCredentials {
  host: string;
  port: number;
  username?: string;
  password?: string;
  fromEmail: string;
  secure?: boolean;
}

export class SmtpEmailProvider implements NotificationProvider {
  readonly name = "smtp";
  readonly channel: NotificationChannel = "EMAIL";

  constructor(private readonly credentials: SmtpCredentials) {}

  async send(
    message: NotificationProviderMessage,
  ): Promise<NotificationProviderResult> {
    const destination = message.destination?.trim() ?? "";
    if (!destination.includes("@")) {
      throw new InvalidNotificationError(
        "Email destination is required.",
        "MISSING_DESTINATION",
      );
    }
    try {
      const transport = createTransport({
        host: this.credentials.host,
        port: this.credentials.port,
        secure: this.credentials.secure ?? this.credentials.port === 465,
        auth:
          this.credentials.username && this.credentials.password
            ? {
                user: this.credentials.username,
                pass: this.credentials.password,
              }
            : undefined,
      });
      const info = await transport.sendMail({
        from: this.credentials.fromEmail,
        to: destination,
        subject: message.subject ?? "Planio bildirimi",
        text: message.body,
        ...(message.html ? { html: message.html } : {}),
      });
      return {
        provider: this.name,
        providerMessageId: info.messageId,
      };
    } catch (error) {
      throw new NotificationProviderError(
        error instanceof Error ? error.message : "SMTP send failed.",
      );
    }
  }
}
