import { Injectable } from "@nestjs/common";
import type { FinanceSummaryReport } from "@xenior/types";
import { zonedDateRange } from "../appointments/appointment-time";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { fromCents, toCents } from "../ledger/money";
import { ListReportsQueryDto } from "./dto/reports.dto";

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  async summary(query: ListReportsQueryDto): Promise<FinanceSummaryReport> {
    const { businessId } = this.requestContext.requireTenant();
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { timezone: true, currency: true },
    });
    const date =
      query.date ??
      new Intl.DateTimeFormat("en-CA", { timeZone: business.timezone }).format(
        new Date(),
      );
    const { start, end } = zonedDateRange(date, business.timezone);
    const inRange = { gte: start, lt: end };

    const [collections, expenses, accounts, receivables, commissions, expenseGroups] =
      await Promise.all([
        this.prisma.collection.aggregate({
          where: { businessId, collectedAt: inRange },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: { businessId, occurredAt: inRange },
          _sum: { amount: true },
        }),
        this.prisma.cashAccount.findMany({
          where: { businessId, isActive: true },
          orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        }),
        this.prisma.customer.findMany({
          where: { businessId, isActive: true, ledgerBalance: { gt: 0 } },
          select: { ledgerBalance: true },
        }),
        this.prisma.commissionEntry.aggregate({
          where: { businessId, earnedAt: inRange },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.expense.groupBy({
          by: ["category"],
          where: { businessId, occurredAt: inRange },
          _sum: { amount: true },
        }),
      ]);

    const collectionsIn = money(collections._sum.amount);
    const expensesOut = money(expenses._sum.amount);
    const accountBalances = await Promise.all(
      accounts.map(async (account) => {
        const [collected, spent] = await Promise.all([
          this.prisma.collection.aggregate({
            where: { cashAccountId: account.id },
            _sum: { amount: true },
          }),
          this.prisma.expense.aggregate({
            where: { cashAccountId: account.id },
            _sum: { amount: true },
          }),
        ]);
        return {
          id: account.id,
          name: account.name,
          type: account.type,
          balance: fromCents(
            toCents(money(collected._sum.amount)) -
              toCents(money(spent._sum.amount)),
          ),
        };
      }),
    );

    return {
      date,
      timezone: business.timezone,
      currency: business.currency,
      cash: {
        collectionsIn,
        expensesOut,
        net: fromCents(toCents(collectionsIn) - toCents(expensesOut)),
        accounts: accountBalances,
      },
      receivables: {
        totalOutstanding: fromCents(
          receivables.reduce(
            (sum, item) => sum + toCents(item.ledgerBalance.toFixed(2)),
            0,
          ),
        ),
        customerCount: receivables.length,
      },
      commissions: {
        totalAmount: money(commissions._sum.amount),
        entryCount: commissions._count._all,
      },
      expenses: {
        totalAmount: expensesOut,
        byCategory: expenseGroups.map((row) => ({
          category: row.category,
          amount: money(row._sum.amount),
        })),
      },
    };
  }
}

function money(value: { toFixed(digits: number): string } | null | undefined): string {
  return value ? value.toFixed(2) : "0.00";
}
