import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@xenior/database";
import type { CashAccountRecord } from "@xenior/types";
import { AuditLogService } from "../audit/audit-log.service";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { SubscriptionAccessService } from "../subscriptions/subscription-access.service";
import { fromCents, toCents } from "./money";
import {
  CreateCashAccountDto,
  UpdateCashAccountDto,
} from "./dto/ledger.dto";

type Database = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CashAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
    private readonly subscriptionAccess: SubscriptionAccessService,
  ) {}

  async list(): Promise<CashAccountRecord[]> {
    const { businessId } = this.requestContext.requireTenant();
    await this.ensureDefault(this.prisma, businessId);
    const accounts = await this.prisma.cashAccount.findMany({
      where: { businessId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    return Promise.all(
      accounts.map((account) => this.toRecord(this.prisma, account)),
    );
  }

  async create(input: CreateCashAccountDto): Promise<CashAccountRecord> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    const business = await this.prisma.business.findFirst({
      where: { id: businessId },
      select: { currency: true },
    });
    if (!business) {
      throw new NotFoundException({
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        if (input.isDefault) {
          await transaction.cashAccount.updateMany({
            where: { businessId, isDefault: true },
            data: { isDefault: false },
          });
        }
        const existing = await transaction.cashAccount.count({
          where: { businessId },
        });
        const account = await transaction.cashAccount.create({
          data: {
            businessId,
            name: input.name,
            type: input.type,
            currency: business.currency,
            isDefault: input.isDefault ?? existing === 0,
          },
        });
        await this.auditLog.record(
          {
            businessId,
            userId: authorization?.user.userId,
            action: "CASH_ACCOUNT_CREATED",
            entityType: "CashAccount",
            entityId: account.id,
            metadata: { fields: ["name", "type"] },
          },
          transaction,
        );
        return this.toRecord(transaction, account);
      });
    } catch (error) {
      this.throwNameConflict(error);
      throw error;
    }
  }

  async update(
    id: string,
    input: UpdateCashAccountDto,
  ): Promise<CashAccountRecord> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    const changed = Object.entries(input).filter(([, value]) => value !== undefined);
    if (changed.length === 0) {
      throw new BadRequestException({
        message: "At least one cash account field must be provided.",
        code: "EMPTY_UPDATE",
      });
    }
    await this.findAccount(this.prisma, businessId, id);

    try {
      return await this.prisma.$transaction(async (transaction) => {
        if (input.isDefault) {
          await transaction.cashAccount.updateMany({
            where: { businessId, isDefault: true, NOT: { id } },
            data: { isDefault: false },
          });
        }
        const account = await transaction.cashAccount.update({
          where: { id },
          data: {
            name: input.name,
            type: input.type,
            isDefault: input.isDefault,
            isActive: input.isActive,
          },
        });
        await this.auditLog.record(
          {
            businessId,
            userId: authorization?.user.userId,
            action: "CASH_ACCOUNT_UPDATED",
            entityType: "CashAccount",
            entityId: id,
            metadata: { fields: changed.map(([key]) => key) },
          },
          transaction,
        );
        return this.toRecord(transaction, account);
      });
    } catch (error) {
      this.throwNameConflict(error);
      throw error;
    }
  }

  async deactivate(id: string): Promise<void> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    const current = await this.findAccount(this.prisma, businessId, id);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.cashAccount.update({
        where: { id },
        data: { isActive: false, isDefault: false },
      });
      if (current.isDefault) {
        const next = await transaction.cashAccount.findFirst({
          where: { businessId, isActive: true, NOT: { id } },
          orderBy: { createdAt: "asc" },
        });
        if (next) {
          await transaction.cashAccount.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
      await this.auditLog.record(
        {
          businessId,
          userId: authorization?.user.userId,
          action: "CASH_ACCOUNT_DEACTIVATED",
          entityType: "CashAccount",
          entityId: id,
          metadata: { fields: ["isActive"] },
        },
        transaction,
      );
    });
  }

  async ensureDefault(
    database: Database,
    businessId: string,
  ): Promise<{ id: string; name: string }> {
    const existing = await database.cashAccount.findFirst({
      where: { businessId, isActive: true },
    });
    if (existing) return existing;
    const business = await database.business.findFirst({
      where: { id: businessId },
      select: { currency: true },
    });
    return database.cashAccount.create({
      data: {
        businessId,
        name: "Nakit kasa",
        type: "CASH",
        currency: business?.currency ?? "TRY",
        isDefault: true,
      },
    });
  }

  async resolveAccount(
    database: Database,
    businessId: string,
    cashAccountId?: string,
  ): Promise<{ id: string; name: string }> {
    if (cashAccountId) {
      const account = await database.cashAccount.findFirst({
        where: { id: cashAccountId, businessId, isActive: true },
      });
      if (!account) {
        throw new BadRequestException({
          message: "Kasa hesabı bu işletmeye ait değil.",
          code: "INVALID_CASH_ACCOUNT",
        });
      }
      return account;
    }
    const fallback =
      (await database.cashAccount.findFirst({
        where: { businessId, isActive: true, isDefault: true },
      })) ?? (await this.ensureDefault(database, businessId));
    return fallback;
  }

  private async findAccount(database: Database, businessId: string, id: string) {
    const account = await database.cashAccount.findFirst({
      where: { id, businessId },
    });
    if (!account) {
      throw new NotFoundException({
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    return account;
  }

  private async toRecord(
    database: Database,
    account: {
      id: string;
      name: string;
      type: "CASH" | "BANK";
      currency: string;
      isDefault: boolean;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
  ): Promise<CashAccountRecord> {
    const [collected, spent] = await Promise.all([
      database.collection.aggregate({
        where: { cashAccountId: account.id },
        _sum: { amount: true },
      }),
      database.expense.aggregate({
        where: { cashAccountId: account.id },
        _sum: { amount: true },
      }),
    ]);
    const balance = fromCents(
      toCents((collected._sum.amount ?? 0).toFixed(2)) -
        toCents((spent._sum.amount ?? 0).toFixed(2)),
    );
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      isDefault: account.isDefault,
      isActive: account.isActive,
      balance,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  private throwNameConflict(error: unknown): void {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new ConflictException({
        message: "Bu isimde bir kasa hesabı zaten var.",
        code: "CASH_ACCOUNT_NAME_CONFLICT",
      });
    }
  }
}
