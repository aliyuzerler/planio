import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Prisma } from "@xenior/database";
import type {
  BroadcastSmsResult,
  CampaignRecord,
  PriceQuote,
  UpdateCampaignInput,
} from "@xenior/types";
import { AuditLogService } from "../audit/audit-log.service";
import { parseStartAt } from "../appointments/appointment-time";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { NotificationDispatcherService } from "../notifications/notification-dispatcher.service";
import { SubscriptionAccessService } from "../subscriptions/subscription-access.service";
import {
  campaignAppliesToService,
  campaignCoversInstant,
  resolvePrice,
  type ResolvedPrice,
} from "./price-resolver";
import {
  CreateCampaignDto,
  ListCampaignsQueryDto,
  PriceQuoteQueryDto,
  UpdateCampaignDto,
  BroadcastSmsDto,
} from "./dto/campaign.dto";

type Database = PrismaService | Prisma.TransactionClient;

const campaignInclude = {
  services: { select: { serviceId: true } },
} as const;

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
    private readonly subscriptionAccess: SubscriptionAccessService,
    @Optional() private readonly dispatcher?: NotificationDispatcherService,
  ) {}

  async list(query: ListCampaignsQueryDto): Promise<CampaignRecord[]> {
    const { businessId } = this.requestContext.requireTenant();
    const campaigns = await this.prisma.campaign.findMany({
      where: { businessId, isActive: query.isActive },
      include: campaignInclude,
      orderBy: [{ startsAt: "desc" }, { name: "asc" }],
    });
    return campaigns.map((campaign) => this.toRecord(campaign));
  }

  async get(id: string): Promise<CampaignRecord> {
    const { businessId } = this.requestContext.requireTenant();
    return this.toRecord(await this.findCampaign(this.prisma, businessId, id));
  }

  async quote(query: PriceQuoteQueryDto): Promise<PriceQuote> {
    const { businessId } = this.requestContext.requireTenant();
    const service = await this.prisma.service.findFirst({
      where: { id: query.serviceId, businessId },
      include: { business: { select: { timezone: true, currency: true } } },
    });
    if (!service) {
      throw new NotFoundException({
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    const at = query.at
      ? parseStartAt(query.at, service.business.timezone)
      : new Date();
    const priced = await this.resolveForService(
      this.prisma,
      businessId,
      service.id,
      at,
      service.price.toFixed(2),
    );
    return {
      serviceId: service.id,
      currency: service.business.currency,
      ...priced,
    };
  }

  async resolveForService(
    database: Database,
    businessId: string,
    serviceId: string,
    at: Date,
    listPrice: string,
  ): Promise<ResolvedPrice> {
    const campaigns = await database.campaign.findMany({
      where: {
        businessId,
        isActive: true,
        startsAt: { lte: at },
        endsAt: { gte: at },
      },
      include: campaignInclude,
    });
    const applicable = campaigns
      .filter(
        (campaign) =>
          campaignCoversInstant(campaign.startsAt, campaign.endsAt, at) &&
          campaignAppliesToService(
            campaign.services.map((item) => item.serviceId),
            serviceId,
          ),
      )
      .map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        discountType: campaign.discountType,
        discountValue: campaign.discountValue.toFixed(2),
      }));
    return resolvePrice(listPrice, applicable);
  }

  async create(input: CreateCampaignDto): Promise<CampaignRecord> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    const bounds = await this.normalizeWindow(businessId, input.startsAt, input.endsAt);
    this.assertDiscount(input.discountType, input.discountValue);
    const serviceIds = await this.assertServices(this.prisma, businessId, input.serviceIds ?? []);

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const campaign = await transaction.campaign.create({
          data: {
            businessId,
            name: input.name,
            discountType: input.discountType,
            discountValue: input.discountValue,
            startsAt: bounds.startsAt,
            endsAt: bounds.endsAt,
            smsTemplate: input.smsTemplate,
            isActive: input.isActive ?? true,
            services: {
              create: serviceIds.map((serviceId) => ({
                businessId,
                serviceId,
              })),
            },
          },
          include: campaignInclude,
        });
        await this.auditLog.record(
          {
            businessId,
            userId: authorization?.user.userId,
            action: "CAMPAIGN_CREATED",
            entityType: "Campaign",
            entityId: campaign.id,
            metadata: { fields: ["name", "discountType", "discountValue", "startsAt", "endsAt"] },
          },
          transaction,
        );
        return this.toRecord(campaign);
      });
    } catch (error) {
      this.throwNameConflict(error);
      throw error;
    }
  }

  async update(id: string, input: UpdateCampaignDto): Promise<CampaignRecord> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    const changedFields = Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key) as (keyof UpdateCampaignInput)[];
    if (changedFields.length === 0) {
      throw new BadRequestException({
        message: "At least one campaign field must be provided.",
        code: "EMPTY_UPDATE",
      });
    }

    const current = await this.findCampaign(this.prisma, businessId, id);
    const discountType = input.discountType ?? current.discountType;
    const discountValue = input.discountValue ?? current.discountValue.toFixed(2);
    this.assertDiscount(discountType, discountValue);
    const startsAt = input.startsAt ?? current.startsAt.toISOString();
    const endsAt = input.endsAt ?? current.endsAt.toISOString();
    const bounds = await this.normalizeWindow(businessId, startsAt, endsAt);
    const serviceIds =
      input.serviceIds === undefined
        ? undefined
        : await this.assertServices(this.prisma, businessId, input.serviceIds);

    try {
      return await this.prisma.$transaction(async (transaction) => {
        if (serviceIds) {
          await transaction.campaignService.deleteMany({
            where: { campaignId: id },
          });
        }
        const campaign = await transaction.campaign.update({
          where: { id },
          data: {
            name: input.name,
            discountType: input.discountType,
            discountValue: input.discountValue,
            startsAt: bounds.startsAt,
            endsAt: bounds.endsAt,
            smsTemplate: input.smsTemplate,
            isActive: input.isActive,
            ...(serviceIds
              ? {
                  services: {
                    create: serviceIds.map((serviceId) => ({
                      businessId,
                      serviceId,
                    })),
                  },
                }
              : {}),
          },
          include: campaignInclude,
        });
        await this.auditLog.record(
          {
            businessId,
            userId: authorization?.user.userId,
            action: "CAMPAIGN_UPDATED",
            entityType: "Campaign",
            entityId: id,
            metadata: { fields: changedFields },
          },
          transaction,
        );
        return this.toRecord(campaign);
      });
    } catch (error) {
      this.throwNameConflict(error);
      throw error;
    }
  }

  async deactivate(id: string): Promise<void> {
    await this.update(id, { isActive: false });
  }

  async broadcastSms(id: string, input: BroadcastSmsDto): Promise<BroadcastSmsResult> {
    const tenant = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(tenant.businessId);
    const campaign = await this.findCampaign(this.prisma, tenant.businessId, id);
    const body = (input.body ?? campaign.smsTemplate ?? "").trim();
    if (!body) {
      throw new BadRequestException({
        message: "Campaign SMS template or body is required.",
        code: "SMS_TEMPLATE_REQUIRED",
      });
    }
    if (!this.dispatcher) {
      throw new ServiceUnavailableException({
        message: "Notification dispatcher is unavailable.",
        code: "BROADCAST_UNAVAILABLE",
      });
    }
    const customers = await this.prisma.customer.findMany({
      where: { businessId: tenant.businessId, isActive: true },
      select: { id: true, phone: true, smsConsent: true },
    });
    let skippedNoConsent = 0;
    let skippedNoPhone = 0;
    const eligible: { id: string; phone: string }[] = [];
    for (const customer of customers) {
      if (!customer.smsConsent) {
        skippedNoConsent += 1;
        continue;
      }
      const phone = customer.phone?.trim() ?? "";
      if (!phone) {
        skippedNoPhone += 1;
        continue;
      }
      eligible.push({ id: customer.id, phone });
    }
    const limit = 200;
    const recipients = eligible.slice(0, limit);
    const skippedOverLimit = eligible.length - recipients.length;
    await this.dispatcher.queueBulkSms({
      businessId: tenant.businessId,
      campaignId: campaign.id,
      body,
      recipients,
    });
    const actorId = this.requestContext.get()?.user.userId;
    if (actorId) {
      await this.auditLog.record({
        businessId: tenant.businessId,
        userId: actorId,
        action: "CAMPAIGN_SMS_BROADCAST",
        entityType: "Campaign",
        entityId: campaign.id,
        metadata: { fields: ["queued", "skippedNoConsent", "skippedNoPhone"] },
      });
    }
    return {
      queued: recipients.length,
      skippedNoConsent,
      skippedNoPhone,
      skippedOverLimit,
      body,
    };
  }

  private async findCampaign(database: Database, businessId: string, id: string) {
    const campaign = await database.campaign.findFirst({
      where: { id, businessId },
      include: campaignInclude,
    });
    if (!campaign) {
      throw new NotFoundException({
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    return campaign;
  }

  private async normalizeWindow(
    businessId: string,
    startsAt: string,
    endsAt: string,
  ): Promise<{ startsAt: Date; endsAt: Date }> {
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { timezone: true },
    });
    const start = parseStartAt(startsAt, business.timezone);
    const end = parseStartAt(endsAt, business.timezone);
    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException({
        message: "Campaign end must be after start.",
        code: "INVALID_CAMPAIGN_WINDOW",
      });
    }
    return { startsAt: start, endsAt: end };
  }

  private assertDiscount(type: "PERCENT" | "AMOUNT", value: string): void {
    if (type === "PERCENT" && Number(value) > 100) {
      throw new BadRequestException({
        message: "Percent discount cannot exceed 100.00.",
        code: "INVALID_DISCOUNT",
      });
    }
    if (Number(value) <= 0) {
      throw new BadRequestException({
        message: "Discount must be greater than zero.",
        code: "INVALID_DISCOUNT",
      });
    }
  }

  private async assertServices(
    database: Database,
    businessId: string,
    serviceIds: string[],
  ): Promise<string[]> {
    if (serviceIds.length === 0) return [];
    const services = await database.service.findMany({
      where: { businessId, id: { in: serviceIds } },
      select: { id: true },
    });
    if (services.length !== serviceIds.length) {
      throw new BadRequestException({
        message: "One or more services do not belong to this business.",
        code: "INVALID_CAMPAIGN_SERVICE",
      });
    }
    return serviceIds;
  }

  private toRecord(campaign: {
    id: string;
    name: string;
    discountType: "PERCENT" | "AMOUNT";
    discountValue: { toFixed(digits: number): string };
    startsAt: Date;
    endsAt: Date;
    isActive: boolean;
    smsTemplate: string | null;
    createdAt: Date;
    updatedAt: Date;
    services: { serviceId: string }[];
  }): CampaignRecord {
    return {
      id: campaign.id,
      name: campaign.name,
      discountType: campaign.discountType,
      discountValue: campaign.discountValue.toFixed(2),
      startsAt: campaign.startsAt.toISOString(),
      endsAt: campaign.endsAt.toISOString(),
      isActive: campaign.isActive,
      smsTemplate: campaign.smsTemplate,
      serviceIds: campaign.services.map((item) => item.serviceId),
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    };
  }

  private throwNameConflict(error: unknown): void {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new ConflictException({
        message: "A campaign with this name already exists.",
        code: "CAMPAIGN_NAME_CONFLICT",
      });
    }
  }
}
