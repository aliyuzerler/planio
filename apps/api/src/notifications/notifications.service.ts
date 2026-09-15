import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@xenior/database";
import type {
  NotificationChannel,
  NotificationChannelSetup,
  NotificationRecord,
  NotificationSettings,
  PaginatedResponse,
  PushDeviceRecord,
} from "@xenior/types";
import { encryptSecret } from "../common/crypto/secret-box";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { NotificationDispatcherService } from "./notification-dispatcher.service";
import { NotificationProviderResolver } from "./providers/provider.resolver";
import {
  ListNotificationsQueryDto,
  RegisterPushDeviceDto,
  TestNotificationChannelDto,
  UpdateNotificationSettingsDto,
  UpsertNotificationChannelDto,
} from "./dto/notification.dto";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly dispatcher: NotificationDispatcherService,
    private readonly resolver: NotificationProviderResolver,
  ) {}

  async getSettings(): Promise<NotificationSettings> {
    const { businessId } = this.requestContext.requireTenant();
    const settings = await this.dispatcher.ensureSettings(businessId);
    return this.toSettings(businessId, settings);
  }

  async updateSettings(
    input: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> {
    const { businessId } = this.requestContext.requireTenant();
    await this.dispatcher.ensureSettings(businessId);
    const settings = await this.prisma.notificationSettings.update({
      where: { businessId },
      data: input,
    });
    return this.toSettings(businessId, settings);
  }

  async list(
    query: ListNotificationsQueryDto,
  ): Promise<PaginatedResponse<NotificationRecord>> {
    const { businessId } = this.requestContext.requireTenant();
    const where: Prisma.NotificationWhereInput = {
      businessId,
      status: query.status,
      type: query.type,
      channel: query.channel,
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return {
      items: items.map((item) => this.toRecord(item)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
      hasMore: query.page * query.pageSize < total,
    };
  }

  async get(id: string): Promise<NotificationRecord> {
    const { businessId } = this.requestContext.requireTenant();
    const notification = await this.prisma.notification.findFirst({
      where: { id, businessId },
    });
    if (!notification) {
      throw new NotFoundException({
        message: "Notification was not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    return this.toRecord(notification);
  }

  async registerDevice(input: RegisterPushDeviceDto): Promise<PushDeviceRecord> {
    const tenant = this.requestContext.requireTenant();
    const authorization = this.requestContext.get();
    const userId = authorization?.user.userId;
    if (!userId) {
      throw new NotFoundException({
        message: "Authenticated user is required.",
        code: "UNAUTHENTICATED",
      });
    }
    const device = await this.prisma.pushDevice.upsert({
      where: {
        businessId_token: { businessId: tenant.businessId, token: input.token },
      },
      create: {
        businessId: tenant.businessId,
        userId,
        token: input.token,
        platform: input.platform,
      },
      update: {
        userId,
        platform: input.platform,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });
    return this.toDevice(device);
  }

  async listChannelSetup(): Promise<NotificationChannelSetup[]> {
    const { businessId } = this.requestContext.requireTenant();
    const rows = await this.prisma.notificationChannelConfig.findMany({
      where: { businessId },
    });
    const byChannel = new Map(rows.map((row) => [row.channel, row]));
    return (["SMS", "WHATSAPP", "EMAIL", "PUSH"] as const).map((channel) => {
      const row = byChannel.get(channel);
      return {
        channel,
        provider: row
          ? (row.provider as NotificationChannelSetup["provider"])
          : null,
        configured: Boolean(row),
        lastTestedAt: row?.lastTestedAt?.toISOString() ?? null,
        lastTestError: row?.lastTestError ?? null,
        hint: this.hintFor(channel, Boolean(row)),
      };
    });
  }

  async upsertChannel(
    input: UpsertNotificationChannelDto,
  ): Promise<NotificationChannelSetup[]> {
    const { businessId } = this.requestContext.requireTenant();
    const built = this.buildCredentials(input);
    await this.prisma.notificationChannelConfig.upsert({
      where: {
        businessId_channel: { businessId, channel: input.channel },
      },
      create: {
        businessId,
        channel: input.channel,
        provider: built.provider,
        credentialsCipher: encryptSecret(
          JSON.stringify(built.credentials),
          this.resolver.encryptionSecret(),
        ),
        extra: built.extra,
      },
      update: {
        provider: built.provider,
        credentialsCipher: encryptSecret(
          JSON.stringify(built.credentials),
          this.resolver.encryptionSecret(),
        ),
        extra: built.extra,
        lastTestError: null,
      },
    });
    return this.listChannelSetup();
  }

  async testChannel(
    input: TestNotificationChannelDto,
  ): Promise<NotificationChannelSetup[]> {
    const { businessId } = this.requestContext.requireTenant();
    const provider = await this.resolver.resolve(businessId, input.channel);
    try {
      await provider.send({
        notificationId: "00000000-0000-4000-8000-000000000000",
        businessId,
        channel: input.channel,
        destination: input.destination,
        subject: "Xenior test",
        body: "Xenior bildirim testi.",
      });
      await this.prisma.notificationChannelConfig.updateMany({
        where: { businessId, channel: input.channel },
        data: { lastTestedAt: new Date(), lastTestError: null },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message.slice(0, 500) : "Test failed.";
      await this.prisma.notificationChannelConfig.updateMany({
        where: { businessId, channel: input.channel },
        data: { lastTestedAt: new Date(), lastTestError: message },
      });
      throw new BadRequestException({
        message,
        code: "NOTIFICATION_TEST_FAILED",
      });
    }
    return this.listChannelSetup();
  }

  private buildCredentials(input: UpsertNotificationChannelDto): {
    provider: string;
    credentials: Record<string, unknown>;
    extra: Prisma.InputJsonValue;
  } {
    if (input.channel === "SMS") {
      if (!input.usercode || !input.password || !input.msgheader) {
        throw new BadRequestException({
          message: "NetGSM usercode, password and msgheader are required.",
          code: "NETGSM_FIELDS_REQUIRED",
        });
      }
      return {
        provider: "netgsm",
        credentials: {
          usercode: input.usercode,
          password: input.password,
          msgheader: input.msgheader,
        },
        extra: { msgheader: input.msgheader },
      };
    }
    if (input.channel === "WHATSAPP") {
      if (!input.accessToken || !input.phoneNumberId) {
        throw new BadRequestException({
          message: "WhatsApp access token and phone number id are required.",
          code: "WHATSAPP_FIELDS_REQUIRED",
        });
      }
      return {
        provider: "meta-whatsapp",
        credentials: {
          accessToken: input.accessToken,
          phoneNumberId: input.phoneNumberId,
          templateName: input.templateName,
        },
        extra: { templateName: input.templateName ?? null },
      };
    }
    if (input.channel === "EMAIL") {
      if (!input.host || !input.fromEmail) {
        throw new BadRequestException({
          message: "SMTP host and from email are required.",
          code: "SMTP_FIELDS_REQUIRED",
        });
      }
      return {
        provider: "smtp",
        credentials: {
          host: input.host,
          port: input.port ?? 587,
          username: input.username,
          password: input.password,
          fromEmail: input.fromEmail,
          secure: input.secure ?? false,
        },
        extra: { host: input.host, fromEmail: input.fromEmail },
      };
    }
    throw new BadRequestException({
      message: "Push uses the platform FCM configuration.",
      code: "PUSH_IS_PLATFORM_MANAGED",
    });
  }

  private hintFor(channel: NotificationChannel, configured: boolean): string {
    if (channel === "SMS") {
      return configured
        ? "NetGSM hesabı kayıtlı. Şifre tekrar gösterilmez."
        : "NetGSM kullanıcı kodu, parola ve mesaj başlığını girin.";
    }
    if (channel === "WHATSAPP") {
      return configured
        ? "WhatsApp Business API kayıtlı."
        : "Meta erişim jetonu ve telefon numarası kimliğini girin.";
    }
    if (channel === "EMAIL") {
      return configured
        ? "SMTP hesabı kayıtlı."
        : "SMTP sunucu, gönderen e-posta ve isteğe bağlı kullanıcı bilgilerini girin.";
    }
    return configured
      ? "Push platform FCM ile gider."
      : "Push için Xenior FCM ayarı gerekir; işletme paneline token girilmez.";
  }

  private toSettings(
    businessId: string,
    settings: {
      smsEnabled: boolean;
      whatsappEnabled: boolean;
      emailEnabled: boolean;
      pushEnabled: boolean;
      notifyOnCreated: boolean;
      notifyOnRescheduled: boolean;
      notifyOnCancelled: boolean;
      reminderEnabled: boolean;
      reminderMinutesBefore: number;
      updatedAt: Date;
    },
  ): NotificationSettings {
    return {
      businessId,
      smsEnabled: settings.smsEnabled,
      whatsappEnabled: settings.whatsappEnabled,
      emailEnabled: settings.emailEnabled,
      pushEnabled: settings.pushEnabled,
      notifyOnCreated: settings.notifyOnCreated,
      notifyOnRescheduled: settings.notifyOnRescheduled,
      notifyOnCancelled: settings.notifyOnCancelled,
      reminderEnabled: settings.reminderEnabled,
      reminderMinutesBefore: settings.reminderMinutesBefore,
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  private toRecord(item: {
    id: string;
    businessId: string;
    appointmentId: string | null;
    type: NotificationRecord["type"];
    channel: NotificationRecord["channel"];
    status: NotificationRecord["status"];
    destination: string | null;
    subject: string | null;
    body: string;
    provider: string | null;
    attemptCount: number;
    scheduledAt: Date | null;
    sentAt: Date | null;
    lastAttemptAt: Date | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): NotificationRecord {
    return {
      id: item.id,
      businessId: item.businessId,
      appointmentId: item.appointmentId,
      type: item.type,
      channel: item.channel,
      status: item.status,
      destination: item.destination,
      subject: item.subject,
      body: item.body,
      provider: item.provider,
      attemptCount: item.attemptCount,
      scheduledAt: item.scheduledAt?.toISOString() ?? null,
      sentAt: item.sentAt?.toISOString() ?? null,
      lastAttemptAt: item.lastAttemptAt?.toISOString() ?? null,
      errorCode: item.errorCode,
      errorMessage: item.errorMessage,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private toDevice(device: {
    id: string;
    token: string;
    platform: PushDeviceRecord["platform"];
    isActive: boolean;
    lastSeenAt: Date;
    createdAt: Date;
  }): PushDeviceRecord {
    return {
      id: device.id,
      token: device.token,
      platform: device.platform,
      isActive: device.isActive,
      lastSeenAt: device.lastSeenAt.toISOString(),
      createdAt: device.createdAt.toISOString(),
    };
  }
}
