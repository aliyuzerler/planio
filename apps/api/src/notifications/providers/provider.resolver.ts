import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiEnv } from "@xenior/config";
import type { NotificationChannel } from "@xenior/types";
import { decryptSecret } from "../../common/crypto/secret-box";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { FcmPushProvider } from "./fcm.push.provider";
import { MetaWhatsAppProvider } from "./meta-whatsapp.provider";
import { NetGsmSmsProvider } from "./netgsm.sms.provider";
import type { NotificationProvider } from "./notification-provider";
import { NotificationProviderRegistry } from "./provider.registry";
import { SmtpEmailProvider } from "./smtp.email.provider";
import { UnconfiguredNotificationProvider } from "./unconfigured.provider";

@Injectable()
export class NotificationProviderResolver {
  constructor(
    private readonly registry: NotificationProviderRegistry,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  async resolve(
    businessId: string,
    channel: NotificationChannel,
  ): Promise<NotificationProvider> {
    const tenant = await this.fromTenant(businessId, channel);
    if (tenant) return tenant;
    const platform = this.fromPlatform(channel);
    if (platform) return platform;
    if (this.allowMock()) {
      try {
        return this.registry.get(channel);
      } catch {
        return new UnconfiguredNotificationProvider(channel);
      }
    }
    return new UnconfiguredNotificationProvider(channel);
  }

  async resolvePlatform(
    channel: NotificationChannel,
  ): Promise<NotificationProvider> {
    const platform = this.fromPlatform(channel);
    if (platform) return platform;
    if (this.allowMock()) {
      try {
        return this.registry.get(channel);
      } catch {
        return new UnconfiguredNotificationProvider(channel);
      }
    }
    return new UnconfiguredNotificationProvider(channel);
  }

  private allowMock(): boolean {
    const env = this.config.get("NODE_ENV", { infer: true });
    if (env !== "production") return true;
    return Boolean(this.config.get("ALLOW_MOCK_NOTIFICATIONS", { infer: true }));
  }

  encryptionSecret(): string {
    return (
      this.config.get("CREDENTIALS_ENCRYPTION_KEY", { infer: true }) ??
      this.config.get("JWT_SECRET", { infer: true })
    );
  }

  private async fromTenant(
    businessId: string,
    channel: NotificationChannel,
  ): Promise<NotificationProvider | null> {
    const row = await this.prisma.notificationChannelConfig.findUnique({
      where: { businessId_channel: { businessId, channel } },
    });
    if (!row) return null;
    const credentials = JSON.parse(
      decryptSecret(row.credentialsCipher, this.encryptionSecret()),
    ) as Record<string, unknown>;
    return this.instantiate(channel, row.provider, credentials);
  }

  private fromPlatform(channel: NotificationChannel): NotificationProvider | null {
    if (channel === "SMS") {
      const usercode = this.config.get("NETGSM_USERCODE", { infer: true });
      const password = this.config.get("NETGSM_PASSWORD", { infer: true });
      const msgheader = this.config.get("NETGSM_MSGHEADER", { infer: true });
      if (!usercode || !password || !msgheader) return null;
      return new NetGsmSmsProvider({
        usercode,
        password,
        msgheader,
        baseUrl: this.config.get("NETGSM_BASE_URL", { infer: true }),
      });
    }
    if (channel === "WHATSAPP") {
      const accessToken = this.config.get("WHATSAPP_ACCESS_TOKEN", { infer: true });
      const phoneNumberId = this.config.get("WHATSAPP_PHONE_NUMBER_ID", {
        infer: true,
      });
      if (!accessToken || !phoneNumberId) return null;
      return new MetaWhatsAppProvider({ accessToken, phoneNumberId });
    }
    if (channel === "EMAIL") {
      const host = this.config.get("SMTP_HOST", { infer: true });
      const fromEmail = this.config.get("SMTP_FROM", { infer: true });
      if (!host || !fromEmail) return null;
      return new SmtpEmailProvider({
        host,
        port: this.config.get("SMTP_PORT", { infer: true }),
        username: this.config.get("SMTP_USER", { infer: true }),
        password: this.config.get("SMTP_PASSWORD", { infer: true }),
        fromEmail,
      });
    }
    if (channel === "PUSH") {
      const projectId = this.config.get("FCM_PROJECT_ID", { infer: true });
      const clientEmail = this.config.get("FCM_CLIENT_EMAIL", { infer: true });
      const privateKey = this.config.get("FCM_PRIVATE_KEY", { infer: true });
      if (!projectId || !clientEmail || !privateKey) return null;
      return new FcmPushProvider({ projectId, clientEmail, privateKey });
    }
    return null;
  }

  private instantiate(
    channel: NotificationChannel,
    provider: string,
    credentials: Record<string, unknown>,
  ): NotificationProvider {
    if (channel === "SMS" && provider === "netgsm") {
      return new NetGsmSmsProvider({
        usercode: String(credentials.usercode ?? ""),
        password: String(credentials.password ?? ""),
        msgheader: String(credentials.msgheader ?? ""),
        baseUrl: credentials.baseUrl ? String(credentials.baseUrl) : undefined,
      });
    }
    if (channel === "WHATSAPP" && provider === "meta-whatsapp") {
      return new MetaWhatsAppProvider({
        accessToken: String(credentials.accessToken ?? ""),
        phoneNumberId: String(credentials.phoneNumberId ?? ""),
        templateName: credentials.templateName
          ? String(credentials.templateName)
          : undefined,
      });
    }
    if (channel === "EMAIL" && provider === "smtp") {
      return new SmtpEmailProvider({
        host: String(credentials.host ?? ""),
        port: Number(credentials.port ?? 587),
        username: credentials.username ? String(credentials.username) : undefined,
        password: credentials.password ? String(credentials.password) : undefined,
        fromEmail: String(credentials.fromEmail ?? ""),
        secure: Boolean(credentials.secure),
      });
    }
    if (channel === "PUSH" && provider === "fcm") {
      return new FcmPushProvider({
        projectId: String(credentials.projectId ?? ""),
        clientEmail: String(credentials.clientEmail ?? ""),
        privateKey: String(credentials.privateKey ?? ""),
      });
    }
    return new UnconfiguredNotificationProvider(channel);
  }
}
