import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
} from "@nestjs/common";
import type { Prisma } from "@xenior/database";
import type { ExpenseRecord, PaginatedResponse } from "@xenior/types";
import { AuditLogService } from "../audit/audit-log.service";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { SubscriptionAccessService } from "../subscriptions/subscription-access.service";
import { CashAccountsService } from "./cash-accounts.service";
import { CreateExpenseDto, ListExpensesQueryDto } from "./dto/ledger.dto";
import { toCents } from "./money";

const expenseInclude = {
  cashAccount: { select: { id: true, name: true } },
  staff: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ExpenseInclude;

function isCommissionEntryUniqueViolation(error: unknown): boolean {
  if (
    !error ||
    typeof error !== "object" ||
    !("code" in error) ||
    error.code !== "P2002"
  ) {
    return false;
  }
  const meta =
    "meta" in error
      ? (error as { meta?: { target?: unknown } }).meta
      : undefined;
  const target = meta?.target;
  if (Array.isArray(target)) {
    return target.includes("commissionEntryId");
  }
  if (typeof target === "string") {
    return target.includes("commissionEntryId");
  }
  return false;
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
    private readonly cashAccounts: CashAccountsService,
    private readonly subscriptionAccess: SubscriptionAccessService,
  ) {}

  async list(
    query: ListExpensesQueryDto,
  ): Promise<PaginatedResponse<ExpenseRecord>> {
    const { businessId } = this.requestContext.requireTenant();
    const where: Prisma.ExpenseWhereInput = {
      businessId,
      category: query.category,
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: expenseInclude,
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return {
      items: items.map((item) => this.toRecord(item)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize) || 0,
      hasMore: query.page * query.pageSize < total,
    };
  }

  async create(input: CreateExpenseDto): Promise<ExpenseRecord> {
    const authorization = this.requestContext.get();
    const tenant = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(tenant.businessId);
    const actorId = authorization?.user.userId;
    if (!actorId) {
      throw new BadRequestException({
        message: "Kimlik doğrulaması gerekli.",
        code: "UNAUTHENTICATED",
      });
    }
    if (toCents(input.amount) <= 0) {
      throw new BadRequestException({
        message: "Gider tutarı sıfırdan büyük olmalıdır.",
        code: "INVALID_EXPENSE",
      });
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const account = await this.cashAccounts.resolveAccount(
          transaction,
          tenant.businessId,
          input.cashAccountId,
        );
        let staffId = input.staffId ?? null;
        if (input.commissionEntryId) {
          const entry = await transaction.commissionEntry.findFirst({
            where: {
              id: input.commissionEntryId,
              businessId: tenant.businessId,
            },
            include: {
              payoutExpense: { select: { id: true } },
            },
          });
          if (!entry) {
            throw new BadRequestException({
              message: "Hakediş satırı bu işletmeye ait değil.",
              code: "INVALID_COMMISSION_ENTRY",
            });
          }
          if (entry.payoutExpense) {
            throw new ConflictException({
              message: "Bu hakediş satırı için ödeme zaten yapılmış.",
              code: "COMMISSION_ALREADY_PAID",
            });
          }
          if (toCents(input.amount) > toCents(entry.amount.toFixed(2))) {
            throw new BadRequestException({
              message: "Hakediş ödemesi kazanılan tutarı aşamaz.",
              code: "COMMISSION_PAYOUT_EXCEEDS",
            });
          }
          staffId = entry.staffId;
        } else if (staffId) {
          const staff = await transaction.staff.findFirst({
            where: { id: staffId, businessId: tenant.businessId },
            select: { id: true },
          });
          if (!staff) {
            throw new BadRequestException({
              message: "Personel bu işletmeye ait değil.",
              code: "INVALID_STAFF",
            });
          }
        }
        const business = await transaction.business.findFirst({
          where: { id: tenant.businessId },
          select: { currency: true },
        });
        const expense = await transaction.expense.create({
          data: {
            businessId: tenant.businessId,
            cashAccountId: account.id,
            createdByUserId: actorId,
            staffId,
            commissionEntryId: input.commissionEntryId ?? null,
            category: input.category,
            amount: input.amount,
            currency: business?.currency ?? "TRY",
            notes: input.notes ?? null,
            occurredAt: input.occurredAt
              ? new Date(input.occurredAt)
              : new Date(),
          },
          include: expenseInclude,
        });
        await this.auditLog.record(
          {
            businessId: tenant.businessId,
            userId: actorId,
            action: "EXPENSE_CREATED",
            entityType: "Expense",
            entityId: expense.id,
            metadata: { fields: ["category", "amount"] },
          },
          transaction,
        );
        return this.toRecord(expense);
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (
        input.commissionEntryId &&
        isCommissionEntryUniqueViolation(error)
      ) {
        throw new ConflictException({
          message: "Bu hakediş satırı için ödeme zaten yapılmış.",
          code: "COMMISSION_ALREADY_PAID",
        });
      }
      throw error;
    }
  }

  private toRecord(item: {
    id: string;
    cashAccountId: string;
    cashAccount: { name: string };
    staff: { id: string; firstName: string; lastName: string } | null;
    commissionEntryId: string | null;
    category: ExpenseRecord["category"];
    amount: { toFixed(digits: number): string };
    currency: string;
    notes: string | null;
    occurredAt: Date;
    createdAt: Date;
  }): ExpenseRecord {
    return {
      id: item.id,
      cashAccountId: item.cashAccountId,
      cashAccountName: item.cashAccount.name,
      staff: item.staff,
      commissionEntryId: item.commissionEntryId,
      category: item.category,
      amount: item.amount.toFixed(2),
      currency: item.currency,
      notes: item.notes,
      occurredAt: item.occurredAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
    };
  }
}
