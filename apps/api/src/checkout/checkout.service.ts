import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiEnv } from "@xenior/config";
import type {
  CheckoutPurpose,
  PaymentLinkRecord,
  PublicCheckoutRecord,
} from "@xenior/types";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { remainingAmount, toCents } from "../ledger/money";
import { SalesService } from "../ledger/sales.service";
import { NotificationDispatcherService } from "../notifications/notification-dispatcher.service";
import { SubscriptionAccessService } from "../subscriptions/subscription-access.service";

const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly sales: SalesService,
    @Optional() private readonly dispatcher: NotificationDispatcherService | null,
    private readonly subscriptionAccess: SubscriptionAccessService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  async createLink(appointmentId: string): Promise<PaymentLinkRecord> {
    const authorization = this.requestContext.get();
    const tenant = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(tenant.businessId);
    const actorId = authorization?.user.userId;
    if (!actorId) {
      throw new BadRequestException({
        message: "Authenticated user is required.",
        code: "UNAUTHENTICATED",
      });
    }

    const created = await this.prisma.$transaction(async (transaction) => {
      const appointment = await transaction.appointment.findFirst({
        where: { id: appointmentId, businessId: tenant.businessId },
        include: {
          sale: true,
          customer: { select: { firstName: true } },
        },
      });
      if (!appointment) {
        throw new NotFoundException({
          message: "Resource not found.",
          code: "RESOURCE_NOT_FOUND",
        });
      }
      if (appointment.status === "CANCELLED" || appointment.status === "NO_SHOW") {
        throw new BadRequestException({
          message: "Cancelled appointments cannot receive a payment link.",
          code: "APPOINTMENT_NOT_PAYABLE",
        });
      }
      const sale = await this.sales.ensureForAppointment(
        transaction,
        appointment,
        actorId,
      );
      const saleRow = await transaction.sale.findFirstOrThrow({
        where: { id: sale.id },
      });
      const remaining = remainingAmount(
        saleRow.totalAmount.toFixed(2),
        saleRow.collectedAmount.toFixed(2),
      );
      if (toCents(remaining) <= 0) {
        throw new BadRequestException({
          message: "This appointment is already paid.",
          code: "ALREADY_PAID",
        });
      }
      const { amount, purpose } = this.resolveCharge(
        appointment.paymentPlan,
        appointment.paymentStatus,
        appointment.depositAmount?.toFixed(2) ?? null,
        remaining,
      );
      await transaction.checkoutIntent.updateMany({
        where: {
          appointmentId: appointment.id,
          status: "PENDING",
        },
        data: { status: "CANCELLED" },
      });
      const expiresAt = new Date(Date.now() + LINK_TTL_MS);
      const intent = await transaction.checkoutIntent.create({
        data: {
          businessId: tenant.businessId,
          appointmentId: appointment.id,
          saleId: saleRow.id,
          customerId: appointment.customerId,
          token: randomUUID(),
          amount,
          purpose,
          expiresAt,
        },
      });
      return {
        token: intent.token,
        amount,
        currency: appointment.currency,
        purpose,
        expiresAt,
      };
    });

    const url = this.payUrl(created.token);
    void this.dispatcher
      ?.queuePaymentLink({
        businessId: tenant.businessId,
        appointmentId,
        url,
        amount: created.amount,
        currency: created.currency,
      })
      .catch(() => undefined);
    return { ...created, url, expiresAt: created.expiresAt.toISOString() };
  }

  async getPublic(token: string): Promise<PublicCheckoutRecord> {
    const intent = await this.loadIntent(token);
    return this.toPublic(intent);
  }

  async completePublic(token: string): Promise<PublicCheckoutRecord> {
    const paid = await this.prisma.$transaction(async (transaction) => {
      const intent = await transaction.checkoutIntent.findFirst({
        where: { token },
        include: {
          appointment: {
            include: {
              business: { select: { name: true } },
              customer: { select: { firstName: true } },
            },
          },
        },
      });
      if (!intent) {
        throw new NotFoundException({
          message: "Payment link not found.",
          code: "CHECKOUT_NOT_FOUND",
        });
      }
      if (intent.status === "PAID") {
        return intent;
      }
      if (intent.status !== "PENDING" || intent.expiresAt.getTime() <= Date.now()) {
        if (intent.status === "PENDING") {
          await transaction.checkoutIntent.update({
            where: { id: intent.id },
            data: { status: "EXPIRED" },
          });
        }
        throw new BadRequestException({
          message: "This payment link is no longer valid.",
          code: "CHECKOUT_NOT_PAYABLE",
        });
      }
      const sale = await this.sales.applyCollection(transaction, {
        businessId: intent.businessId,
        saleId: intent.saleId,
        amount: intent.amount.toFixed(2),
        method: "LINK",
        notes: `Ödeme linki · ${intent.purpose}`,
        collectedByUserId: intent.appointment.createdByUserId,
      });
      const collection = sale.collections[sale.collections.length - 1];
      return transaction.checkoutIntent.update({
        where: { id: intent.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          collectionId: collection?.id,
        },
        include: {
          appointment: {
            include: {
              business: { select: { name: true } },
              customer: { select: { firstName: true } },
            },
          },
        },
      });
    });
    return this.toPublic(await this.loadIntent(paid.token));
  }

  private resolveCharge(
    plan: "DEPOSIT" | "FULL" | "ON_DAY",
    status: "UNPAID" | "PARTIAL" | "PAID",
    depositAmount: string | null,
    remaining: string,
  ): { amount: string; purpose: CheckoutPurpose } {
    if (plan === "DEPOSIT" && status === "UNPAID" && depositAmount) {
      const depositCents = toCents(depositAmount);
      const remainingCents = toCents(remaining);
      return {
        amount: depositCents <= remainingCents ? depositAmount : remaining,
        purpose: "DEPOSIT",
      };
    }
    if (plan === "FULL" && status === "UNPAID") {
      return { amount: remaining, purpose: "FULL" };
    }
    return { amount: remaining, purpose: "REMAINING" };
  }

  private payUrl(token: string): string {
    const webUrl = this.config.get("WEB_URL", { infer: true }).replace(/\/$/, "");
    return `${webUrl}/pay/${token}`;
  }

  private async loadIntent(token: string) {
    const intent = await this.prisma.checkoutIntent.findFirst({
      where: { token },
        include: {
          appointment: {
            include: {
              business: { select: { name: true } },
              customer: { select: { firstName: true } },
            },
          },
        },
    });
    if (!intent) {
      throw new NotFoundException({
        message: "Payment link not found.",
        code: "CHECKOUT_NOT_FOUND",
      });
    }
    if (intent.status === "PENDING" && intent.expiresAt.getTime() <= Date.now()) {
      return this.prisma.checkoutIntent.update({
        where: { id: intent.id },
        data: { status: "EXPIRED" },
        include: {
          appointment: {
            include: {
              business: { select: { name: true } },
              customer: { select: { firstName: true } },
            },
          },
        },
      });
    }
    return intent;
  }

  private toPublic(intent: {
    token: string;
    amount: { toFixed(digits: number): string };
    purpose: CheckoutPurpose;
    status: PublicCheckoutRecord["status"];
    expiresAt: Date;
    appointment: {
      serviceNameSnapshot: string;
      currency: string;
      customerId: string;
      business: { name: string };
      customer: { firstName: string };
    };
  }): PublicCheckoutRecord {
    return {
      token: intent.token,
      businessName: intent.appointment.business.name,
      serviceName: intent.appointment.serviceNameSnapshot,
      customerFirstName: intent.appointment.customer.firstName,
      amount: intent.amount.toFixed(2),
      currency: intent.appointment.currency,
      purpose: intent.purpose,
      status: intent.status,
      expiresAt: intent.expiresAt.toISOString(),
    };
  }
}
