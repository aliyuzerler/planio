import { Injectable } from "@nestjs/common";
import type { Prisma } from "@xenior/database";
import type {
  LedgerCustomerRecord,
  LedgerEntryRecord,
  PaginatedResponse,
} from "@xenior/types";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { ListLedgerEntriesQueryDto } from "./dto/ledger.dto";

@Injectable()
export class LedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  async listEntries(
    query: ListLedgerEntriesQueryDto,
  ): Promise<PaginatedResponse<LedgerEntryRecord>> {
    const { businessId } = this.requestContext.requireTenant();
    const where: Prisma.CustomerLedgerEntryWhereInput = {
      businessId,
      customerId: query.customerId,
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.customerLedgerEntry.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.customerLedgerEntry.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        id: item.id,
        customer: item.customer,
        saleId: item.saleId,
        collectionId: item.collectionId,
        type: item.type,
        amount: item.amount.toFixed(2),
        balanceAfter: item.balanceAfter.toFixed(2),
        description: item.description,
        occurredAt: item.occurredAt.toISOString(),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize) || 0,
      hasMore: query.page * query.pageSize < total,
    };
  }

  async listCustomers(): Promise<LedgerCustomerRecord[]> {
    const { businessId } = this.requestContext.requireTenant();
    const customers = await this.prisma.customer.findMany({
      where: { businessId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        ledgerBalance: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return customers.map((item) => ({
      id: item.id,
      firstName: item.firstName,
      lastName: item.lastName,
      ledgerBalance: item.ledgerBalance.toFixed(2),
    }));
  }
}
