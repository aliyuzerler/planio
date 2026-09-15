import { Injectable } from "@nestjs/common";
import type { Prisma } from "@xenior/database";
import type { PaginatedResponse, TenantAuditLogItem } from "@xenior/types";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import type { ListTenantAuditLogsQueryDto } from "../reports/dto/reports.dto";

type AuditDatabase = Pick<Prisma.TransactionClient, "auditLog">;

export interface AuditRecordInput {
  businessId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    input: AuditRecordInput,
    database: AuditDatabase = this.prisma,
  ): Promise<void> {
    await database.auditLog.create({
      data: {
        businessId: input.businessId,
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
      },
    });
  }

  async listForTenant(
    businessId: string,
    query: ListTenantAuditLogsQueryDto,
  ): Promise<PaginatedResponse<TenantAuditLogItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const skip = (page - 1) * pageSize;
    const where = { businessId };
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      items: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        userId: log.userId,
        createdAt: log.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page * pageSize < total,
    };
  }
}
