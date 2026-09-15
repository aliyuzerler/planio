import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@xenior/database";
import type { ApiEnv } from "@xenior/config";
import type {
  PaymentCheckoutSession,
  PaymentRecord,
  PaymentStatus,
} from "@xenior/types";
import { AuditLogService } from "../audit/audit-log.service";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { toIyzicoPaymentInterval } from "../subscriptions/subscription-period";
import { CreatePaymentCheckoutDto } from "./dto/payment.dto";
import { sanitizeProviderMetadata } from "./iyzico/iyzico-metadata";
import {
  verifyHppWebhookSignature,
  verifySubscriptionWebhookSignature,
} from "./iyzico/iyzico-webhook";
import {
  IYZICO_SUBSCRIPTION_PORT,
  type IyzicoCheckoutResult,
  type IyzicoSubscriptionPort,
} from "./iyzico/iyzico.port";

const paymentSelect = {
  id: true,
  businessId: true,
  subscriptionId: true,
  amount: true,
  currency: true,
  status: true,
  provider: true,
  externalPaymentId: true,
  externalReference: true,
  paidAt: true,
  failedAt: true,
  errorCode: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PaymentSelect;

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
    private readonly subscriptions: SubscriptionsService,
    private readonly config: ConfigService<ApiEnv, true>,
    @Inject(IYZICO_SUBSCRIPTION_PORT)
    private readonly iyzico: IyzicoSubscriptionPort,
  ) {}

  async startCheckout(
    input: CreatePaymentCheckoutDto,
  ): Promise<PaymentCheckoutSession> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    const plan = await this.prisma.plan.findFirst({ where: { id: input.planId } });
    if (!plan?.isActive) {
      throw new NotFoundException({
        message: "Plan was not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    const pricingPlanReferenceCode =
      plan.externalPricingPlanCode ?? this.mockPricingPlanCode(plan.id);
    if (!pricingPlanReferenceCode) {
      throw new BadRequestException({
        message: "This plan is not mapped to an iyzico pricing plan.",
        code: "PLAN_NOT_MAPPED",
      });
    }
    const iyzicoInterval = toIyzicoPaymentInterval(plan.billingPeriod);

    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: authorization?.user.userId },
    });
    const business = await this.prisma.business.findFirstOrThrow({
      where: { id: businessId },
    });
    const subscription = await this.subscriptions.prepareForCheckout(plan.id);
    const payment = await this.prisma.payment.create({
      data: {
        businessId,
        subscriptionId: subscription.id,
        amount: plan.price,
        currency: plan.currency,
        status: "PENDING",
        provider: "IYZICO",
        metadata: {
          intendedPlanId: plan.id,
          pricingPlanReferenceCode,
          billingPeriod: plan.billingPeriod,
          paymentInterval: iyzicoInterval.paymentInterval,
          paymentIntervalCount: iyzicoInterval.paymentIntervalCount,
          amount: plan.price.toFixed(2),
          currency: plan.currency,
        },
      },
      select: paymentSelect,
    });

    try {
      const checkout = await this.iyzico.initializeCheckout({
        conversationId: payment.id,
        callbackUrl: `${this.config.get("API_URL", { infer: true })}/api/v1/payments/iyzico/callback`,
        pricingPlanReferenceCode,
        customer: {
          name: user.firstName ?? business.name,
          surname: user.lastName ?? "Owner",
          email: user.email,
          gsmNumber: input.gsmNumber,
          identityNumber: input.identityNumber,
          billingAddress: {
            address: input.billingAddress.address,
            contactName:
              input.billingAddress.contactName ||
              `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
              business.name,
            city: input.billingAddress.city,
            country: input.billingAddress.country,
            zipCode: input.billingAddress.zipCode,
          },
        },
      });
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "PROCESSING",
          externalReference: checkout.token,
          metadata: {
            intendedPlanId: plan.id,
            pricingPlanReferenceCode,
            billingPeriod: plan.billingPeriod,
            paymentInterval: iyzicoInterval.paymentInterval,
            paymentIntervalCount: iyzicoInterval.paymentIntervalCount,
            amount: plan.price.toFixed(2),
            currency: plan.currency,
            token: checkout.token,
          },
        },
        select: paymentSelect,
      });
      await this.auditLog.record({
        businessId,
        userId: authorization?.user.userId,
        action: "PAYMENT_CHECKOUT_CREATED",
        entityType: "Payment",
        entityId: updated.id,
        metadata: { fields: ["status", "externalReference"] },
      });
      return {
        payment: this.toRecord(updated),
        subscription: await this.subscriptions.getById(subscription.id),
        checkout: {
          token: checkout.token,
          paymentPageUrl: checkout.paymentPageUrl,
          tokenExpireTime: checkout.tokenExpireTime,
        },
      };
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorCode: "IYZICO_PROVIDER_ERROR",
          errorMessage: "Checkout initialization failed.",
        },
      });
      throw error;
    }
  }

  async list(): Promise<PaymentRecord[]> {
    const { businessId } = this.requestContext.requireTenant();
    const payments = await this.prisma.payment.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: paymentSelect,
    });
    return payments.map((payment) => this.toRecord(payment));
  }

  async get(id: string): Promise<PaymentRecord> {
    const { businessId } = this.requestContext.requireTenant();
    const payment = await this.prisma.payment.findFirst({
      where: { id, businessId },
      select: paymentSelect,
    });
    if (!payment) {
      throw new NotFoundException({
        message: "The requested resource was not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    return this.toRecord(payment);
  }

  async sync(id: string): Promise<PaymentRecord> {
    const { businessId } = this.requestContext.requireTenant();
    const payment = await this.prisma.payment.findFirst({
      where: { id, businessId },
    });
    if (!payment?.externalReference) {
      throw new NotFoundException({
        message: "The requested resource was not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    return this.completeFromToken(payment.externalReference);
  }

  async completeFromToken(token: string): Promise<PaymentRecord> {
    const result = await this.iyzico.retrieveCheckoutResult(token);
    return this.applyCheckoutResult(result, token);
  }

  async handleWebhook(
    signature: string | undefined,
    payload: Record<string, unknown>,
  ): Promise<{ accepted: true }> {
    if (!signature) {
      throw new UnauthorizedException({
        message: "Webhook signature is required.",
        code: "WEBHOOK_SIGNATURE_INVALID",
      });
    }
    const secretKey = this.config.get("IYZICO_SECRET_KEY", { infer: true });
    const merchantId = this.config.get("IYZICO_MERCHANT_ID", { infer: true });
    if (!secretKey) {
      throw new UnauthorizedException({
        message: "Webhook verification is not configured.",
        code: "WEBHOOK_SIGNATURE_INVALID",
      });
    }

    const eventType = String(payload.iyziEventType ?? "");
    if (
      eventType === "subscription.order.success" ||
      eventType === "subscription.order.failure"
    ) {
      if (
        !merchantId ||
        !verifySubscriptionWebhookSignature({
          merchantId,
          secretKey,
          eventType,
          subscriptionReferenceCode: String(payload.subscriptionReferenceCode ?? ""),
          orderReferenceCode: String(payload.orderReferenceCode ?? ""),
          customerReferenceCode: String(payload.customerReferenceCode ?? ""),
          headerSignature: signature,
        })
      ) {
        throw new UnauthorizedException({
          message: "Webhook signature is invalid.",
          code: "WEBHOOK_SIGNATURE_INVALID",
        });
      }
      await this.applySubscriptionWebhook(payload, eventType);
      return { accepted: true };
    }

    if (eventType === "CHECKOUT_FORM_AUTH") {
      const token = String(payload.token ?? "");
      if (
        !verifyHppWebhookSignature({
          secretKey,
          eventType,
          iyziPaymentId: String(payload.iyziPaymentId ?? ""),
          token,
          paymentConversationId: String(payload.paymentConversationId ?? ""),
          status: String(payload.status ?? ""),
          headerSignature: signature,
        })
      ) {
        throw new UnauthorizedException({
          message: "Webhook signature is invalid.",
          code: "WEBHOOK_SIGNATURE_INVALID",
        });
      }
      if (payload.status === "SUCCESS" && token) {
        await this.completeFromToken(token);
      } else if (token) {
        await this.markFailedByToken(token, "CHECKOUT_FORM_AUTH", "Checkout failed.");
      }
      return { accepted: true };
    }

    throw new BadRequestException({
      message: "Unsupported webhook event.",
      code: "WEBHOOK_INVALID",
    });
  }

  private async applyCheckoutResult(
    result: IyzicoCheckoutResult,
    token: string,
  ): Promise<PaymentRecord> {
    const payment = await this.findPayment({
      id: result.conversationId,
      token,
    });
    if (!payment) {
      throw new NotFoundException({
        message: "Payment was not found for this checkout.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    if (payment.status === "SUCCEEDED") {
      return this.toRecord(
        await this.prisma.payment.findFirstOrThrow({
          where: { id: payment.id },
          select: paymentSelect,
        }),
      );
    }
    if (result.status !== "success" || result.subscriptionStatus === "PENDING") {
      return this.failPayment(
        payment.id,
        result.errorCode ?? "PAYMENT_FAILED",
        result.errorMessage ?? "Payment was not successful.",
        result,
      );
    }
    this.assertCheckoutMatchesPayment(payment, result);
    return this.succeedPayment(payment.id, {
      externalPaymentId: result.subscriptionReferenceCode,
      token,
      metadata: result,
      subscriptionReferenceCode: result.subscriptionReferenceCode,
      customerReferenceCode: result.customerReferenceCode,
      planId: this.metadataString(payment.metadata, "intendedPlanId"),
    });
  }

  private async applySubscriptionWebhook(
    payload: Record<string, unknown>,
    eventType: string,
  ): Promise<void> {
    const orderReferenceCode = String(payload.orderReferenceCode ?? "");
    const subscriptionReferenceCode = String(
      payload.subscriptionReferenceCode ?? "",
    );
    const sameOrder = orderReferenceCode
      ? await this.prisma.payment.findFirst({
          where: { provider: "IYZICO", externalPaymentId: orderReferenceCode },
        })
      : null;
    if (sameOrder?.status === "SUCCEEDED") {
      return;
    }
    const pending = await this.prisma.payment.findFirst({
      where: {
        provider: "IYZICO",
        status: { in: ["PENDING", "PROCESSING"] },
        subscription: { externalSubscriptionId: subscriptionReferenceCode },
      },
      orderBy: { createdAt: "desc" },
    });
    if (eventType === "subscription.order.failure") {
      if (pending) {
        await this.failPayment(
          pending.id,
          "subscription.order.failure",
          "Recurring payment failed.",
          payload,
        );
      } else if (subscriptionReferenceCode) {
        const subscription = await this.prisma.subscription.findFirst({
          where: {
            externalProvider: "IYZICO",
            externalSubscriptionId: subscriptionReferenceCode,
          },
          include: { plan: true },
        });
        if (subscription) {
          await this.prisma.payment.create({
            data: {
              businessId: subscription.businessId,
              subscriptionId: subscription.id,
              amount: subscription.plan.price,
              currency: subscription.plan.currency,
              status: "FAILED",
              provider: "IYZICO",
              externalPaymentId: orderReferenceCode || null,
              failedAt: new Date(),
              errorCode: "subscription.order.failure",
              errorMessage: "Recurring payment failed.",
              metadata: sanitizeProviderMetadata(payload) as Prisma.InputJsonValue,
            },
          });
        }
      }
      if (subscriptionReferenceCode) {
        await this.subscriptions.markPastDueByExternalId(subscriptionReferenceCode);
      }
      return;
    }
    if (pending) {
      await this.succeedPayment(pending.id, {
        externalPaymentId: orderReferenceCode,
        token: pending.externalReference,
        metadata: payload,
        subscriptionReferenceCode,
        customerReferenceCode: String(payload.customerReferenceCode ?? ""),
        planId: this.metadataString(pending.metadata, "intendedPlanId"),
      });
      return;
    }
    if (!subscriptionReferenceCode) return;
    await this.subscriptions.renewByExternalId(subscriptionReferenceCode);
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        externalProvider: "IYZICO",
        externalSubscriptionId: subscriptionReferenceCode,
      },
      include: { plan: true },
    });
    if (!subscription) return;
    await this.prisma.payment.create({
      data: {
        businessId: subscription.businessId,
        subscriptionId: subscription.id,
        amount: subscription.plan.price,
        currency: subscription.plan.currency,
        status: "SUCCEEDED",
        provider: "IYZICO",
        externalPaymentId: orderReferenceCode,
        paidAt: new Date(),
        metadata: sanitizeProviderMetadata(payload) as Prisma.InputJsonValue,
      },
    });
  }

  private async succeedPayment(
    paymentId: string,
    input: {
      externalPaymentId: string | null;
      token: string | null;
      metadata: unknown;
      subscriptionReferenceCode: string | null;
      customerReferenceCode: string | null;
      planId: string | null;
    },
  ): Promise<PaymentRecord> {
    const payment = await this.prisma.payment.findFirstOrThrow({
      where: { id: paymentId },
      include: { subscription: { include: { plan: true } } },
    });
    if (input.externalPaymentId) {
      const duplicate = await this.prisma.payment.findFirst({
        where: {
          provider: "IYZICO",
          externalPaymentId: input.externalPaymentId,
          NOT: { id: payment.id },
        },
      });
      if (duplicate?.status === "SUCCEEDED") {
        return this.toRecord(
          await this.prisma.payment.findFirstOrThrow({
            where: { id: payment.id },
            select: paymentSelect,
          }),
        );
      }
    }

    const updated = await this.prisma.$transaction(async (transaction) => {
      const next = await transaction.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCEEDED",
          externalPaymentId: input.externalPaymentId,
          externalReference: input.token ?? payment.externalReference,
          paidAt: new Date(),
          failedAt: null,
          errorCode: null,
          errorMessage: null,
          metadata: sanitizeProviderMetadata({
            ...(typeof payment.metadata === "object" && payment.metadata
              ? payment.metadata
              : {}),
            provider: input.metadata,
          }) as Prisma.InputJsonValue,
        },
        select: paymentSelect,
      });
      await this.subscriptions.activateAfterPayment(
        {
          subscriptionId: payment.subscriptionId,
          businessId: payment.businessId,
          planId: input.planId ?? payment.subscription.planId,
          externalCustomerId: input.customerReferenceCode,
          externalSubscriptionId: input.subscriptionReferenceCode,
        },
        transaction,
      );
      await this.auditLog.record(
        {
          businessId: payment.businessId,
          action: "PAYMENT_SUCCEEDED",
          entityType: "Payment",
          entityId: payment.id,
          metadata: { fields: ["status", "externalPaymentId"] },
        },
        transaction,
      );
      return next;
    });
    return this.toRecord(updated);
  }

  private async failPayment(
    paymentId: string,
    errorCode: string,
    errorMessage: string,
    metadata: unknown,
  ): Promise<PaymentRecord> {
    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorCode,
        errorMessage,
        metadata: sanitizeProviderMetadata(metadata) as Prisma.InputJsonValue,
      },
      select: paymentSelect,
    });
    return this.toRecord(updated);
  }

  private async markFailedByToken(
    token: string,
    errorCode: string,
    errorMessage: string,
  ): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: { provider: "IYZICO", externalReference: token },
    });
    if (!payment || payment.status === "SUCCEEDED") return;
    await this.failPayment(payment.id, errorCode, errorMessage, { token });
  }

  private async findPayment(query: {
    id: string | null;
    token: string;
  }): Promise<(PaymentRow & { metadata: Prisma.JsonValue }) | null> {
    return this.prisma.payment.findFirst({
      where: {
        provider: "IYZICO",
        OR: [
          ...(query.id ? [{ id: query.id }] : []),
          { externalReference: query.token },
        ],
      },
    });
  }

  private assertCheckoutMatchesPayment(
    payment: { amount: { toFixed(digits: number): string }; currency: string; metadata: Prisma.JsonValue },
    result: IyzicoCheckoutResult,
  ): void {
    const expectedAmount = this.metadataString(payment.metadata, "amount");
    const expectedCurrency = this.metadataString(payment.metadata, "currency");
    const expectedPlan = this.metadataString(
      payment.metadata,
      "pricingPlanReferenceCode",
    );
    if (expectedAmount && expectedAmount !== payment.amount.toFixed(2)) {
      throw new ForbiddenException({
        message: "Payment amount does not match the selected plan.",
        code: "PAYMENT_AMOUNT_MISMATCH",
      });
    }
    if (expectedCurrency && expectedCurrency !== payment.currency) {
      throw new ForbiddenException({
        message: "Payment currency does not match the selected plan.",
        code: "PAYMENT_CURRENCY_MISMATCH",
      });
    }
    if (
      expectedPlan &&
      result.pricingPlanReferenceCode &&
      expectedPlan !== result.pricingPlanReferenceCode
    ) {
      throw new ForbiddenException({
        message: "Payment does not belong to the selected plan.",
        code: "PAYMENT_PLAN_MISMATCH",
      });
    }
  }

  private metadataString(metadata: Prisma.JsonValue, key: string): string | null {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return null;
    }
    const value = (metadata as Record<string, unknown>)[key];
    return typeof value === "string" ? value : null;
  }

  private mockPricingPlanCode(planId: string): string | null {
    const apiKey = this.config.get("IYZICO_API_KEY", { infer: true });
    return apiKey ? null : planId;
  }

  private toRecord(payment: PaymentRow): PaymentRecord {
    return {
      id: payment.id,
      businessId: payment.businessId,
      subscriptionId: payment.subscriptionId,
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      status: payment.status as PaymentStatus,
      provider: "IYZICO",
      externalPaymentId: payment.externalPaymentId,
      externalReference: payment.externalReference,
      paidAt: payment.paidAt?.toISOString() ?? null,
      failedAt: payment.failedAt?.toISOString() ?? null,
      errorCode: payment.errorCode,
      errorMessage: payment.errorMessage,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }
}
