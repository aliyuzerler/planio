import { BadRequestException, ConflictException, Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiEnv } from "@xenior/config";
import type {
  BusinessHoursSettings,
  BusinessProfile,
  UpdateBusinessHoursInput,
  UpdateBusinessInput,
} from "@xenior/types";
import { createAuthTokenValue, hashAuthToken } from "../auth/auth-token";
import { AuditLogService } from "../audit/audit-log.service";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { MailService } from "../notifications/mail.service";
import { renderInviteEmail } from "../notifications/email-templates";
import { SubscriptionAccessService } from "../subscriptions/subscription-access.service";
import { InviteAccountantDto } from "./dto/invite-accountant.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";
import { defaultWeeklyHours } from "./hours";

@Injectable()
export class BusinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
    private readonly subscriptionAccess: SubscriptionAccessService,
    private readonly config: ConfigService<ApiEnv, true>,
    @Optional() private readonly mail?: MailService,
  ) {}

  async getProfile(): Promise<BusinessProfile> {
    const { businessId } = this.requestContext.requireTenant();
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });
    return this.toProfile(business);
  }

  async updateProfile(input: UpdateBusinessDto): Promise<BusinessProfile> {
    const authorization = this.requestContext.get();
    const tenant = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(tenant.businessId);
    const changedFields = (
      Object.entries(input)
        .filter(([, value]) => value !== undefined)
        .map(([key]) => key)
    ) as (keyof UpdateBusinessInput)[];
    if (changedFields.length === 0) {
      throw new BadRequestException({
        message: "At least one business field must be provided.",
        code: "EMPTY_UPDATE",
      });
    }

    return this.prisma.$transaction(async (transaction) => {
      const business = await transaction.business.update({
        where: { id: tenant.businessId },
        data: {
          name: input.name,
          phone: input.phone,
          email: input.email,
          address: input.address,
          timezone: input.timezone,
          currency: input.currency,
        },
      });

      await this.auditLog.record(
        {
          businessId: tenant.businessId,
          userId: authorization?.user.userId,
          action: "BUSINESS_PROFILE_UPDATED",
          entityType: "Business",
          entityId: tenant.businessId,
          metadata: { fields: changedFields },
        },
        transaction,
      );

      return this.toProfile(business);
    });
  }

  async getHours(): Promise<BusinessHoursSettings> {
    const { businessId } = this.requestContext.requireTenant();
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      include: { businessHours: { orderBy: { weekday: "asc" } } },
    });
    const byDay = new Map(
      business.businessHours.map((row) => [row.weekday, row]),
    );
    return {
      hoursEnforced: business.hoursEnforced,
      days: defaultWeeklyHours().map((slot) => {
        const row = byDay.get(slot.weekday);
        return row
          ? {
              weekday: row.weekday,
              startMinutes: row.startMinutes,
              endMinutes: row.endMinutes,
              isClosed: row.isClosed,
            }
          : slot;
      }),
    };
  }

  async updateHours(input: UpdateBusinessHoursInput): Promise<BusinessHoursSettings> {
    const weekdays = input.days.map((day) => day.weekday);
    if (new Set(weekdays).size !== 7) {
      throw new BadRequestException({
        message: "Hours must include each weekday exactly once.",
        code: "INVALID_BUSINESS_HOURS",
      });
    }
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.business.update({
        where: { id: businessId },
        data: { hoursEnforced: input.hoursEnforced },
      });
      for (const day of input.days) {
        await transaction.businessHours.upsert({
          where: {
            businessId_weekday: { businessId, weekday: day.weekday },
          },
          create: {
            businessId,
            weekday: day.weekday,
            startMinutes: day.startMinutes,
            endMinutes: day.endMinutes,
            isClosed: day.isClosed,
          },
          update: {
            startMinutes: day.startMinutes,
            endMinutes: day.endMinutes,
            isClosed: day.isClosed,
          },
        });
      }
    });
    return this.getHours();
  }

  async inviteAccountant(input: InviteAccountantDto): Promise<{ sent: true }> {
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.businessUser.findFirst({
      where: {
        businessId,
        user: { email },
      },
      include: { user: { select: { email: true } } },
    });
    if (existing) {
      throw new ConflictException({
        message: "This email already has a membership in the business.",
        code: "MEMBERSHIP_EXISTS",
      });
    }

    const staff = await this.prisma.staff.create({
      data: {
        businessId,
        firstName: input.firstName,
        lastName: input.lastName,
        email,
        loginRole: "ACCOUNTANT",
      },
    });

    const raw = createAuthTokenValue();
    await this.prisma.authToken.create({
      data: {
        purpose: "STAFF_INVITE",
        tokenHash: hashAuthToken(raw),
        email,
        businessId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: {
          staffId: staff.id,
          role: "ACCOUNTANT",
          firstName: input.firstName,
          lastName: input.lastName,
        },
      },
    });
    const webUrl = this.config.get("WEB_URL", { infer: true });
    const link = `${webUrl}/invite?token=${encodeURIComponent(raw)}`;
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { name: true },
    });
    const rendered = renderInviteEmail({
      webUrl,
      inviteUrl: link,
      email,
      businessName: business.name,
      roleLabel: "Muhasebe",
    });
    await this.mail?.sendBestEffort({
      businessId,
      destination: email,
      subject: rendered.subject,
      body: rendered.text,
      html: rendered.html,
    });
    return { sent: true };
  }

  private toProfile(business: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    timezone: string;
    currency: string;
    status: "ACTIVE" | "SUSPENDED" | "CLOSED";
    createdAt: Date;
    updatedAt: Date;
  }): BusinessProfile {
    return {
      id: business.id,
      name: business.name,
      phone: business.phone,
      email: business.email,
      address: business.address,
      timezone: business.timezone,
      currency: business.currency,
      status: business.status,
      createdAt: business.createdAt.toISOString(),
      updatedAt: business.updatedAt.toISOString(),
    };
  }
}
