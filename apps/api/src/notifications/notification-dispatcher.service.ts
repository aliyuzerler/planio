import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@xenior/database";
import type { NotificationChannel, NotificationType } from "@xenior/types";
import type {
  AppointmentNotificationEvent,
  AppointmentNotificationPort,
} from "../appointments/appointment-notification.port";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import {
  formatAppointmentWhen,
  renderAppointmentMessage,
} from "./notification-messages";
import { NotificationQueueService } from "./notification-queue.service";
import { reminderScheduledAt } from "./notification-schedule";

type Settings = {
  businessId: string;
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
};

@Injectable()
export class NotificationDispatcherService
  implements AppointmentNotificationPort
{
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: NotificationQueueService,
  ) {}

  async queuePaymentLink(input: {
    businessId: string;
    appointmentId: string;
    url: string;
    amount: string;
    currency: string;
  }): Promise<void> {
    const appointment = await this.loadAppointment(
      input.businessId,
      input.appointmentId,
    );
    if (!appointment) return;
    const settings = await this.ensureSettings(input.businessId);
    const body = `${appointment.businessName} randevu ödemesi: ${input.amount} ${input.currency}. ${input.url}`;
    for (const channel of this.enabledChannels(settings, appointment)) {
      if (channel === "PUSH") continue;
      const destination = this.destinationFor(channel, appointment);
      if (!destination) continue;
      await this.createAndQueue({
        businessId: appointment.businessId,
        appointmentId: appointment.id,
        recipientCustomerId: appointment.customer.id,
        recipientStaffId: null,
        recipientUserId: null,
        type: "CUSTOM",
        channel,
        destination,
        subject:
          channel === "EMAIL" ? `${appointment.businessName} ödeme bağlantısı` : null,
        body,
        status: "PENDING",
        scheduledAt: null,
      });
    }
  }

  async queueOfficialDocument(input: {
    businessId: string;
    businessName: string;
    type: "E_FATURA" | "SMM";
    documentNo: string;
    customer: {
      id: string;
      phone: string | null;
      email: string | null;
      smsConsent: boolean;
      emailConsent: boolean;
    };
  }): Promise<void> {
    const label = input.type === "SMM" ? "SMM" : "e-Fatura";
    const body = `${input.businessName} ${label} kesildi. Belge no: ${input.documentNo}.`;
    if (input.customer.smsConsent && input.customer.phone?.trim()) {
      await this.createAndQueue({
        businessId: input.businessId,
        appointmentId: null,
        recipientCustomerId: input.customer.id,
        recipientStaffId: null,
        recipientUserId: null,
        type: "CUSTOM",
        channel: "SMS",
        destination: input.customer.phone.trim(),
        subject: null,
        body,
        status: "PENDING",
        scheduledAt: null,
        payload: { kind: "OFFICIAL_DOCUMENT", documentNo: input.documentNo },
      });
    }
    if (input.customer.emailConsent && input.customer.email?.trim()) {
      await this.createAndQueue({
        businessId: input.businessId,
        appointmentId: null,
        recipientCustomerId: input.customer.id,
        recipientStaffId: null,
        recipientUserId: null,
        type: "CUSTOM",
        channel: "EMAIL",
        destination: input.customer.email.trim(),
        subject: `${input.businessName} ${label}`,
        body,
        status: "PENDING",
        scheduledAt: null,
        payload: { kind: "OFFICIAL_DOCUMENT", documentNo: input.documentNo },
      });
    }
  }

  async queueBulkSms(input: {
    businessId: string;
    campaignId: string;
    body: string;
    recipients: { id: string; phone: string }[];
  }): Promise<void> {
    const staggerMs = 250;
    for (const [index, recipient] of input.recipients.entries()) {
      const scheduledAt =
        index === 0 ? null : new Date(Date.now() + index * staggerMs);
      await this.createAndQueue({
        businessId: input.businessId,
        appointmentId: null,
        recipientCustomerId: recipient.id,
        recipientStaffId: null,
        recipientUserId: null,
        type: "CUSTOM",
        channel: "SMS",
        destination: recipient.phone,
        subject: null,
        body: input.body,
        status: scheduledAt ? "SCHEDULED" : "PENDING",
        scheduledAt,
        payload: { kind: "CAMPAIGN_BROADCAST", campaignId: input.campaignId },
      });
    }
  }

  async onAppointmentEvent(input: {
    businessId: string;
    appointmentId: string;
    type: AppointmentNotificationEvent;
  }): Promise<void> {
    if (input.type === "COMPLETED" || input.type === "NO_SHOW") {
      await this.cancelPendingReminders(input.businessId, input.appointmentId);
      return;
    }

    const settings = await this.ensureSettings(input.businessId);
    if (input.type === "RESCHEDULED" || input.type === "CANCELLED") {
      await this.cancelPendingReminders(input.businessId, input.appointmentId);
    }

    const appointment = await this.loadAppointment(
      input.businessId,
      input.appointmentId,
    );
    if (!appointment) {
      this.logger.warn(
        `Appointment ${input.appointmentId} not found for notification.`,
      );
      return;
    }

    const notificationType = this.toNotificationType(input.type);
    if (notificationType && this.eventEnabled(settings, input.type)) {
      await this.enqueueImmediate(settings, appointment, notificationType);
    }
    if (
      (input.type === "CREATED" || input.type === "RESCHEDULED") &&
      settings.reminderEnabled
    ) {
      await this.enqueueReminder(settings, appointment);
    }
  }

  private async enqueueImmediate(
    settings: Settings,
    appointment: AppointmentContext,
    type: NotificationType,
  ) {
    const context = this.messageContext(appointment);
    for (const channel of this.enabledChannels(settings, appointment)) {
      const destination = this.destinationFor(channel, appointment);
      const message = renderAppointmentMessage(type, channel, context);
      await this.createAndQueue({
        businessId: appointment.businessId,
        appointmentId: appointment.id,
        recipientCustomerId: channel === "PUSH" ? null : appointment.customer.id,
        recipientStaffId: channel === "PUSH" ? appointment.staff.id : null,
        recipientUserId:
          channel === "PUSH" ? (appointment.staff.businessUserId ?? null) : null,
        type,
        channel,
        destination,
        ...message,
        status: "PENDING",
        scheduledAt: null,
      });
    }
  }

  private async enqueueReminder(
    settings: Settings,
    appointment: AppointmentContext,
  ) {
    const scheduledAt = reminderScheduledAt(
      appointment.startAt,
      settings.reminderMinutesBefore,
    );
    if (!scheduledAt) return;
    const context = this.messageContext(appointment);
    for (const channel of this.enabledChannels(settings, appointment)) {
      const destination = this.destinationFor(channel, appointment);
      const message = renderAppointmentMessage(
        "APPOINTMENT_REMINDER",
        channel,
        context,
      );
      await this.createAndQueue({
        businessId: appointment.businessId,
        appointmentId: appointment.id,
        recipientCustomerId: channel === "PUSH" ? null : appointment.customer.id,
        recipientStaffId: channel === "PUSH" ? appointment.staff.id : null,
        recipientUserId:
          channel === "PUSH" ? (appointment.staff.businessUserId ?? null) : null,
        type: "APPOINTMENT_REMINDER",
        channel,
        destination,
        ...message,
        status: "SCHEDULED",
        scheduledAt,
      });
    }
  }

  private async createAndQueue(input: {
    businessId: string;
    appointmentId: string | null;
    recipientCustomerId: string | null;
    recipientStaffId: string | null;
    recipientUserId: string | null;
    type: NotificationType;
    channel: NotificationChannel;
    destination: string | null;
    subject: string | null;
    body: string;
    status: "PENDING" | "SCHEDULED";
    scheduledAt: Date | null;
    payload?: Prisma.InputJsonValue;
  }) {
    const created = await this.prisma.notification.create({
      data: {
        businessId: input.businessId,
        appointmentId: input.appointmentId,
        recipientCustomerId: input.recipientCustomerId,
        recipientStaffId: input.recipientStaffId,
        recipientUserId: input.recipientUserId,
        type: input.type,
        channel: input.channel,
        destination: input.destination,
        subject: input.subject,
        body: input.body,
        status: input.status,
        scheduledAt: input.scheduledAt,
        payload: input.payload ?? { appointmentId: input.appointmentId },
      },
    });
    try {
      await this.queue.enqueue(
        created.id,
        created.businessId,
        created.scheduledAt,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to enqueue notification.";
      await this.prisma.notification.update({
        where: { id: created.id },
        data: {
          status: "FAILED",
          errorCode: "ENQUEUE_FAILED",
          errorMessage: message.slice(0, 2000),
        },
      });
      this.logger.error(`Failed to enqueue notification ${created.id}`, error);
    }
  }

  private async cancelPendingReminders(
    businessId: string,
    appointmentId: string,
  ) {
    const pending = await this.prisma.notification.findMany({
      where: {
        businessId,
        appointmentId,
        type: "APPOINTMENT_REMINDER",
        status: { in: ["PENDING", "SCHEDULED"] },
      },
      select: { id: true },
    });
    if (pending.length === 0) return;
    await this.prisma.notification.updateMany({
      where: { id: { in: pending.map((item) => item.id) } },
      data: {
        status: "CANCELLED",
        errorCode: "SUPERSEDED",
        errorMessage: "Reminder cancelled because the appointment changed.",
      },
    });
    await Promise.all(pending.map((item) => this.queue.remove(item.id)));
  }

  private enabledChannels(
    settings: Settings,
    appointment: AppointmentContext,
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];
    if (settings.smsEnabled && appointment.customer.smsConsent) {
      channels.push("SMS");
    }
    if (settings.whatsappEnabled && appointment.customer.whatsappConsent) {
      channels.push("WHATSAPP");
    }
    if (settings.emailEnabled && appointment.customer.emailConsent) {
      channels.push("EMAIL");
    }
    if (settings.pushEnabled) channels.push("PUSH");
    return channels;
  }

  private destinationFor(
    channel: NotificationChannel,
    appointment: AppointmentContext,
  ): string | null {
    if (channel === "SMS" || channel === "WHATSAPP") {
      return appointment.customer.phone?.trim() || null;
    }
    if (channel === "EMAIL") {
      return appointment.customer.email?.trim() || null;
    }
    return appointment.staffPushToken;
  }

  private eventEnabled(settings: Settings, type: AppointmentNotificationEvent) {
    if (type === "CREATED") return settings.notifyOnCreated;
    if (type === "RESCHEDULED") return settings.notifyOnRescheduled;
    if (type === "CANCELLED") return settings.notifyOnCancelled;
    return false;
  }

  private toNotificationType(
    type: AppointmentNotificationEvent,
  ): NotificationType | null {
    if (type === "CREATED") return "APPOINTMENT_CONFIRMED";
    if (type === "RESCHEDULED") return "APPOINTMENT_RESCHEDULED";
    if (type === "CANCELLED") return "APPOINTMENT_CANCELLED";
    return null;
  }

  private messageContext(appointment: AppointmentContext) {
    return {
      customerName: `${appointment.customer.firstName} ${appointment.customer.lastName}`.trim(),
      staffName: `${appointment.staff.firstName} ${appointment.staff.lastName}`.trim(),
      serviceName: appointment.serviceNameSnapshot,
      when: formatAppointmentWhen(appointment.startAt, appointment.timezone),
      businessName: appointment.businessName,
    };
  }

  private async loadAppointment(businessId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, businessId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            smsConsent: true,
            whatsappConsent: true,
            emailConsent: true,
          },
        },
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            businessUserId: true,
            businessUser: { select: { userId: true } },
          },
        },
        business: { select: { name: true, timezone: true } },
      },
    });
    if (!appointment) return null;
    const userId = appointment.staff.businessUser?.userId;
    const device = userId
      ? await this.prisma.pushDevice.findFirst({
          where: { businessId, userId, isActive: true },
          orderBy: { lastSeenAt: "desc" },
          select: { token: true },
        })
      : null;
    return {
      id: appointment.id,
      businessId: appointment.businessId,
      startAt: appointment.startAt,
      serviceNameSnapshot: appointment.serviceNameSnapshot,
      customer: appointment.customer,
      staff: appointment.staff,
      businessName: appointment.business.name,
      timezone: appointment.business.timezone,
      staffPushToken: device?.token ?? null,
    };
  }

  async ensureSettings(businessId: string): Promise<Settings> {
    return this.prisma.notificationSettings.upsert({
      where: { businessId },
      create: { businessId },
      update: {},
    });
  }
}

type AppointmentContext = {
  id: string;
  businessId: string;
  startAt: Date;
  serviceNameSnapshot: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    smsConsent: boolean;
    whatsappConsent: boolean;
    emailConsent: boolean;
  };
  staff: {
    id: string;
    firstName: string;
    lastName: string;
    businessUserId: string | null;
  };
  businessName: string;
  timezone: string;
  staffPushToken: string | null;
};
