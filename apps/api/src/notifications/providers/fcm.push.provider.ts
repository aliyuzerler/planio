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

export interface FcmCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export class FcmPushProvider implements NotificationProvider {
  readonly name = "fcm";
  readonly channel: NotificationChannel = "PUSH";

  constructor(private readonly credentials: FcmCredentials) {}

  async send(
    message: NotificationProviderMessage,
  ): Promise<NotificationProviderResult> {
    const token = message.destination?.trim() ?? "";
    if (!token) {
      throw new InvalidNotificationError(
        "Push destination token is required.",
        "MISSING_DESTINATION",
      );
    }
    const accessToken = await this.accessToken();
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${this.credentials.projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title: message.subject ?? "Xenior",
              body: message.body,
            },
            data: {
              notificationId: message.notificationId,
              businessId: message.businessId,
            },
          },
        }),
      },
    );
    const payload = (await response.json().catch(() => ({}))) as {
      name?: string;
      error?: { status?: string; message?: string };
    };
    if (!response.ok) {
      if (payload.error?.status === "NOT_FOUND") {
        throw new InvalidNotificationError(
          "Push token is no longer valid.",
          "PUSH_TOKEN_INVALID",
        );
      }
      throw new NotificationProviderError(
        payload.error?.message ?? `FCM HTTP ${response.status}`,
      );
    }
    return { provider: this.name, providerMessageId: payload.name };
  }

  private async accessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
      JSON.stringify({ alg: "RS256", typ: "JWT" }),
    ).toString("base64url");
    const claims = Buffer.from(
      JSON.stringify({
        iss: this.credentials.clientEmail,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    ).toString("base64url");
    const { createSign } = await import("node:crypto");
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${claims}`);
    const signature = signer.sign(
      this.credentials.privateKey.replace(/\\n/g, "\n"),
      "base64url",
    );
    const assertion = `${header}.${claims}.${signature}`;
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    const payload = (await response.json()) as { access_token?: string };
    if (!payload.access_token) {
      throw new NotificationProviderError("FCM access token could not be issued.");
    }
    return payload.access_token;
  }
}
