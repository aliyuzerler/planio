import { Injectable, Logger } from "@nestjs/common";
import { UnrecoverableError } from "bullmq";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { NOTIFICATION_MAX_ATTEMPTS } from "./notification.constants";
import { InvalidNotificationError } from "./notification-errors";
import { NotificationProviderResolver } from "./providers/provider.resolver";

const terminal = new Set(["SENT", "CANCELLED"]);

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: NotificationProviderResolver,
  ) {}

  async process(notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new UnrecoverableError(`Notification ${notificationId} was not found.`);
    }
    if (terminal.has(notification.status)) {
      return;
    }

    if (notification.type === "APPOINTMENT_REMINDER") {
      const skip = await this.shouldSkipReminder(notification);
      if (skip) return;
    }

    const attemptCount = notification.attemptCount + 1;
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: "PROCESSING",
        attemptCount,
        lastAttemptAt: new Date(),
        errorCode: null,
        errorMessage: null,
      },
    });

    try {
      const provider = await this.providers.resolve(
        notification.businessId,
        notification.channel,
      );
      const result = await provider.send({
        notificationId: notification.id,
        businessId: notification.businessId,
        channel: notification.channel,
        destination: notification.destination,
        subject: notification.subject,
        body: notification.body,
        payload: notification.payload,
      });
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          provider: result.provider,
          errorCode: null,
          errorMessage: null,
        },
      });
    } catch (error) {
      const failed = error instanceof InvalidNotificationError;
      const code =
        error instanceof InvalidNotificationError
          ? error.code
          : "PROVIDER_FAILURE";
      const message =
        error instanceof Error ? error.message : "Notification delivery failed.";
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: "FAILED",
          errorCode: code,
          errorMessage: message.slice(0, 2000),
          provider: this.safeProviderName(notification.channel),
        },
      });
      if (failed || attemptCount >= NOTIFICATION_MAX_ATTEMPTS) {
        this.logger.warn(
          `Notification ${notificationId} failed permanently (${code}).`,
        );
        throw new UnrecoverableError(message);
      }
      throw error;
    }
  }

  private async shouldSkipReminder(notification: {
    id: string;
    businessId: string;
    appointmentId: string | null;
  }): Promise<boolean> {
    if (!notification.appointmentId) {
      await this.cancel(notification.id, "MISSING_APPOINTMENT", "Reminder has no appointment.");
      return true;
    }
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: notification.appointmentId,
        businessId: notification.businessId,
      },
      select: { status: true, startAt: true },
    });
    if (!appointment || appointment.status !== "CONFIRMED") {
      await this.cancel(
        notification.id,
        "APPOINTMENT_NOT_CONFIRMED",
        "Reminder skipped because the appointment is no longer confirmed.",
      );
      return true;
    }
    if (appointment.startAt.getTime() <= Date.now()) {
      await this.cancel(
        notification.id,
        "REMINDER_TOO_LATE",
        "Reminder skipped because the appointment has already started.",
      );
      return true;
    }
    return false;
  }

  private async cancel(id: string, errorCode: string, errorMessage: string) {
    await this.prisma.notification.update({
      where: { id },
      data: { status: "CANCELLED", errorCode, errorMessage },
    });
  }

  private safeProviderName(
    channel: "SMS" | "WHATSAPP" | "PUSH" | "EMAIL",
  ): string {
    return channel.toLowerCase();
  }
}
