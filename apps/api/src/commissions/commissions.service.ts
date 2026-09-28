import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@xenior/database";
import type {
  CommissionEntryRecord,
  CommissionRuleRecord,
  PaginatedResponse,
  UpdateCommissionRuleInput,
} from "@xenior/types";
import { AuditLogService } from "../audit/audit-log.service";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { SubscriptionAccessService } from "../subscriptions/subscription-access.service";
import { resolveCommission } from "./commission-resolver";
import {
  CreateCommissionRuleDto,
  ListCommissionEntriesQueryDto,
  ListCommissionRulesQueryDto,
  UpdateCommissionRuleDto,
} from "./dto/commission.dto";

type Database = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CommissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
    private readonly subscriptionAccess: SubscriptionAccessService,
  ) {}

  async listRules(
    query: ListCommissionRulesQueryDto,
  ): Promise<CommissionRuleRecord[]> {
    const { businessId } = this.requestContext.requireTenant();
    const rules = await this.prisma.commissionRule.findMany({
      where: { businessId, isActive: query.isActive },
      orderBy: [{ name: "asc" }],
    });
    return rules.map((rule) => this.toRule(rule));
  }

  async getRule(id: string): Promise<CommissionRuleRecord> {
    const { businessId } = this.requestContext.requireTenant();
    return this.toRule(await this.findRule(this.prisma, businessId, id));
  }

  async createRule(input: CreateCommissionRuleDto): Promise<CommissionRuleRecord> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    this.assertCommission(input.commissionType, input.commissionValue);
    await this.assertService(this.prisma, businessId, input.serviceId ?? null);

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const rule = await transaction.commissionRule.create({
          data: {
            businessId,
            name: input.name,
            serviceId: input.serviceId ?? null,
            commissionType: input.commissionType,
            commissionValue: input.commissionValue,
            isActive: input.isActive ?? true,
          },
        });
        await this.auditLog.record(
          {
            businessId,
            userId: authorization?.user.userId,
            action: "COMMISSION_RULE_CREATED",
            entityType: "CommissionRule",
            entityId: rule.id,
            metadata: { fields: ["name", "commissionType", "commissionValue"] },
          },
          transaction,
        );
        return this.toRule(rule);
      });
    } catch (error) {
      this.throwNameConflict(error);
      throw error;
    }
  }

  async updateRule(
    id: string,
    input: UpdateCommissionRuleDto,
  ): Promise<CommissionRuleRecord> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    const changedFields = Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key) as (keyof UpdateCommissionRuleInput)[];
    if (changedFields.length === 0) {
      throw new BadRequestException({
        message: "At least one commission rule field must be provided.",
        code: "EMPTY_UPDATE",
      });
    }

    const current = await this.findRule(this.prisma, businessId, id);
    const commissionType = input.commissionType ?? current.commissionType;
    const commissionValue =
      input.commissionValue ?? current.commissionValue.toFixed(2);
    this.assertCommission(commissionType, commissionValue);
    if (input.serviceId !== undefined) {
      await this.assertService(this.prisma, businessId, input.serviceId);
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const rule = await transaction.commissionRule.update({
          where: { id },
          data: {
            name: input.name,
            commissionType: input.commissionType,
            commissionValue: input.commissionValue,
            serviceId: input.serviceId,
            isActive: input.isActive,
          },
        });
        await this.auditLog.record(
          {
            businessId,
            userId: authorization?.user.userId,
            action: "COMMISSION_RULE_UPDATED",
            entityType: "CommissionRule",
            entityId: rule.id,
            metadata: { fields: changedFields },
          },
          transaction,
        );
        return this.toRule(rule);
      });
    } catch (error) {
      this.throwNameConflict(error);
      throw error;
    }
  }

  async deactivateRule(id: string): Promise<void> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    await this.findRule(this.prisma, businessId, id);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.commissionRule.update({
        where: { id },
        data: { isActive: false },
      });
      await this.auditLog.record(
        {
          businessId,
          userId: authorization?.user.userId,
          action: "COMMISSION_RULE_DEACTIVATED",
          entityType: "CommissionRule",
          entityId: id,
          metadata: { fields: ["isActive"] },
        },
        transaction,
      );
    });
  }

  async listEntries(
    query: ListCommissionEntriesQueryDto,
  ): Promise<PaginatedResponse<CommissionEntryRecord>> {
    const tenant = this.requestContext.requireTenant();
    const staffFilter = await this.resolveStaffFilter(
      tenant.businessId,
      tenant.role,
      tenant.businessUserId,
      query.staffId,
    );
    const where: Prisma.CommissionEntryWhereInput = {
      businessId: tenant.businessId,
      staffId: staffFilter,
      ...(query.from || query.to
        ? {
            earnedAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.commissionEntry.findMany({
        where,
        include: {
          staff: { select: { id: true, firstName: true, lastName: true } },
          payoutExpense: { select: { id: true } },
        },
        orderBy: [{ earnedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.commissionEntry.count({ where }),
    ]);
    return {
      items: items.map((item) => this.toEntry(item)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize) || 0,
      hasMore: query.page * query.pageSize < total,
    };
  }

  async recordForCompletedAppointment(
    database: Database,
    appointment: {
      id: string;
      businessId: string;
      staffId: string;
      serviceId: string;
      serviceNameSnapshot: string;
      servicePriceSnapshot: { toFixed(digits: number): string };
      currency: string;
      staff: { firstName: string; lastName: string };
    },
    earnedAt: Date,
  ): Promise<void> {
    const rules = await database.commissionRule.findMany({
      where: { businessId: appointment.businessId, isActive: true },
    });
    const resolved = resolveCommission(
      appointment.servicePriceSnapshot.toFixed(2),
      rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        serviceId: rule.serviceId,
        commissionType: rule.commissionType,
        commissionValue: rule.commissionValue.toFixed(2),
      })),
      appointment.serviceId,
    );
    if (!resolved) return;

    try {
      await database.commissionEntry.create({
        data: {
          businessId: appointment.businessId,
          staffId: appointment.staffId,
          appointmentId: appointment.id,
          ruleId: resolved.ruleId,
          sourceType: "APPOINTMENT",
          sourceId: appointment.id,
          staffNameSnapshot: `${appointment.staff.firstName} ${appointment.staff.lastName}`.trim(),
          serviceNameSnapshot: appointment.serviceNameSnapshot,
          ruleNameSnapshot: resolved.ruleName,
          basisAmount: appointment.servicePriceSnapshot.toFixed(2),
          commissionType: resolved.commissionType,
          commissionValue: resolved.commissionValue,
          amount: resolved.amount,
          currency: appointment.currency,
          earnedAt,
        },
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        return;
      }
      throw error;
    }
  }

  private async resolveStaffFilter(
    businessId: string,
    role: string | null,
    businessUserId: string | null,
    requestedStaffId?: string,
  ): Promise<string | undefined> {
    if (role === "STAFF") {
      if (!businessUserId) {
        throw new ForbiddenException({
          message: "Staff profile is required to view commissions.",
          code: "STAFF_PROFILE_REQUIRED",
        });
      }
      const staff = await this.prisma.staff.findFirst({
        where: { businessId, businessUserId },
        select: { id: true },
      });
      if (!staff) {
        throw new ForbiddenException({
          message: "Staff profile is required to view commissions.",
          code: "STAFF_PROFILE_REQUIRED",
        });
      }
      if (requestedStaffId && requestedStaffId !== staff.id) {
        throw new ForbiddenException({
          message: "Staff can only view their own commissions.",
          code: "INSUFFICIENT_BUSINESS_ROLE",
        });
      }
      return staff.id;
    }
    return requestedStaffId;
  }

  private async findRule(database: Database, businessId: string, id: string) {
    const rule = await database.commissionRule.findFirst({
      where: { id, businessId },
    });
    if (!rule) {
      throw new NotFoundException({
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    return rule;
  }

  private async assertService(
    database: Database,
    businessId: string,
    serviceId: string | null,
  ): Promise<void> {
    if (!serviceId) return;
    const service = await database.service.findFirst({
      where: { id: serviceId, businessId },
      select: { id: true },
    });
    if (!service) {
      throw new BadRequestException({
        message: "Service does not belong to this business.",
        code: "INVALID_COMMISSION_SERVICE",
      });
    }
  }

  private assertCommission(type: "PERCENT" | "AMOUNT", value: string): void {
    if (type === "PERCENT" && Number(value) > 100) {
      throw new BadRequestException({
        message: "Percent commission cannot exceed 100.00.",
        code: "INVALID_COMMISSION",
      });
    }
    if (Number(value) <= 0) {
      throw new BadRequestException({
        message: "Commission must be greater than zero.",
        code: "INVALID_COMMISSION",
      });
    }
  }

  private toRule(rule: {
    id: string;
    name: string;
    serviceId: string | null;
    commissionType: "PERCENT" | "AMOUNT";
    commissionValue: { toFixed(digits: number): string };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CommissionRuleRecord {
    return {
      id: rule.id,
      name: rule.name,
      serviceId: rule.serviceId,
      commissionType: rule.commissionType,
      commissionValue: rule.commissionValue.toFixed(2),
      isActive: rule.isActive,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }

  private toEntry(entry: {
    id: string;
    appointmentId: string | null;
    ruleId: string | null;
    sourceType: "APPOINTMENT";
    sourceId: string;
    staffNameSnapshot: string;
    serviceNameSnapshot: string;
    ruleNameSnapshot: string;
    basisAmount: { toFixed(digits: number): string };
    commissionType: "PERCENT" | "AMOUNT";
    commissionValue: { toFixed(digits: number): string };
    amount: { toFixed(digits: number): string };
    currency: string;
    earnedAt: Date;
    createdAt: Date;
    staff: { id: string; firstName: string; lastName: string };
    payoutExpense?: { id: string } | null;
  }): CommissionEntryRecord {
    return {
      id: entry.id,
      staff: entry.staff,
      appointmentId: entry.appointmentId,
      ruleId: entry.ruleId,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      staffNameSnapshot: entry.staffNameSnapshot,
      serviceNameSnapshot: entry.serviceNameSnapshot,
      ruleNameSnapshot: entry.ruleNameSnapshot,
      basisAmount: entry.basisAmount.toFixed(2),
      commissionType: entry.commissionType,
      commissionValue: entry.commissionValue.toFixed(2),
      amount: entry.amount.toFixed(2),
      currency: entry.currency,
      earnedAt: entry.earnedAt.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      payoutExpenseId: entry.payoutExpense?.id ?? null,
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
        message: "A commission rule with this name already exists.",
        code: "COMMISSION_RULE_NAME_CONFLICT",
      });
    }
  }
}
