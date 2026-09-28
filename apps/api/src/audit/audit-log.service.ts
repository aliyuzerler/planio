import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "@xenior/database";
import type { PaginatedResponse, TenantAuditLogItem } from "@xenior/types";
import { zonedDateRange } from "../appointments/appointment-time";
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

const EXPENSE_LABEL: Record<string, string> = {
  RENT: "Kira",
  UTILITY: "Fatura",
  MATERIAL: "Malzeme",
  SALARY: "Maaş",
  COMMISSION: "Prim",
  OTHER: "Diğer",
};

const COLLECTION_METHOD: Record<string, string> = {
  CASH: "Nakit",
  CARD: "POS",
  LINK: "Link",
};

const FILE_KIND: Record<string, string> = {
  PHOTO: "Fotoğraf",
  DOCUMENT: "Belge",
  OTHER: "Dosya",
};

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

    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException({
        message: "from must be earlier than or equal to to.",
        code: "INVALID_DATE_RANGE",
      });
    }

    const where: Prisma.AuditLogWhereInput = { businessId };
    if (query.action?.trim()) {
      where.action = query.action.trim();
    }
    if (query.from || query.to) {
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { timezone: true },
      });
      const timeZone = business?.timezone ?? "Europe/Istanbul";
      const fromDay = query.from ?? query.to!;
      const toDay = query.to ?? query.from!;
      where.createdAt = {
        gte: zonedDateRange(fromDay, timeZone).start,
        lt: zonedDateRange(toDay, timeZone).end,
      };
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    const summaries = await this.buildSummaries(businessId, logs);
    return {
      items: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        summary: summaries.get(log.id) ?? null,
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

  private async buildSummaries(
    businessId: string,
    logs: Array<{
      id: string;
      entityType: string;
      entityId: string;
      metadata: Prisma.JsonValue;
    }>,
  ): Promise<Map<string, string>> {
    const byType = new Map<string, string[]>();
    for (const log of logs) {
      const ids = byType.get(log.entityType) ?? [];
      ids.push(log.entityId);
      byType.set(log.entityType, ids);
    }

    const lookup = new Map<string, string>();

    const put = (entityType: string, id: string, summary: string) => {
      lookup.set(`${entityType}:${id}`, summary);
    };

    const tasks: Array<Promise<void>> = [
      this.loadNamed(businessId, byType.get("Customer"), async (ids) => {
        const rows = await this.prisma.customer.findMany({
          where: { businessId, id: { in: ids } },
          select: { id: true, firstName: true, lastName: true },
        });
        for (const row of rows) {
          put("Customer", row.id, `${row.firstName} ${row.lastName}`.trim());
        }
      }),
      this.loadNamed(businessId, byType.get("Staff"), async (ids) => {
        const rows = await this.prisma.staff.findMany({
          where: { businessId, id: { in: ids } },
          select: { id: true, firstName: true, lastName: true },
        });
        for (const row of rows) {
          put("Staff", row.id, `${row.firstName} ${row.lastName}`.trim());
        }
      }),
      this.loadNamed(businessId, byType.get("Service"), async (ids) => {
        const rows = await this.prisma.service.findMany({
          where: { businessId, id: { in: ids } },
          select: { id: true, name: true },
        });
        for (const row of rows) put("Service", row.id, row.name);
      }),
      this.loadNamed(businessId, byType.get("Resource"), async (ids) => {
        const rows = await this.prisma.resource.findMany({
          where: { businessId, id: { in: ids } },
          select: { id: true, name: true },
        });
        for (const row of rows) put("Resource", row.id, row.name);
      }),
      this.loadNamed(businessId, byType.get("Specialization"), async (ids) => {
        const rows = await this.prisma.specialization.findMany({
          where: { businessId, id: { in: ids } },
          select: { id: true, name: true },
        });
        for (const row of rows) put("Specialization", row.id, row.name);
      }),
      this.loadNamed(businessId, byType.get("Campaign"), async (ids) => {
        const rows = await this.prisma.campaign.findMany({
          where: { businessId, id: { in: ids } },
          select: { id: true, name: true },
        });
        for (const row of rows) put("Campaign", row.id, row.name);
      }),
      this.loadNamed(businessId, byType.get("CommissionRule"), async (ids) => {
        const rows = await this.prisma.commissionRule.findMany({
          where: { businessId, id: { in: ids } },
          select: { id: true, name: true },
        });
        for (const row of rows) put("CommissionRule", row.id, row.name);
      }),
      this.loadNamed(businessId, byType.get("CashAccount"), async (ids) => {
        const rows = await this.prisma.cashAccount.findMany({
          where: { businessId, id: { in: ids } },
          select: { id: true, name: true, type: true },
        });
        for (const row of rows) {
          put(
            "CashAccount",
            row.id,
            `${row.name} · ${row.type === "BANK" ? "Banka" : "Nakit"}`,
          );
        }
      }),
      this.loadNamed(businessId, byType.get("Appointment"), async (ids) => {
        const rows = await this.prisma.appointment.findMany({
          where: { businessId, id: { in: ids } },
          select: {
            id: true,
            serviceNameSnapshot: true,
            startAt: true,
            customer: { select: { firstName: true, lastName: true } },
          },
        });
        for (const row of rows) {
          const customer = `${row.customer.firstName} ${row.customer.lastName}`.trim();
          const when = row.startAt.toLocaleString("tr-TR", {
            dateStyle: "short",
            timeStyle: "short",
          });
          put(
            "Appointment",
            row.id,
            `${customer} · ${row.serviceNameSnapshot} · ${when}`,
          );
        }
      }),
      this.loadNamed(businessId, byType.get("Sale"), async (ids) => {
        const rows = await this.prisma.sale.findMany({
          where: { businessId, id: { in: ids } },
          select: {
            id: true,
            totalAmount: true,
            currency: true,
            source: true,
            customer: { select: { firstName: true, lastName: true } },
            lines: { select: { nameSnapshot: true }, take: 1 },
          },
        });
        for (const row of rows) {
          const customer = `${row.customer.firstName} ${row.customer.lastName}`.trim();
          const service = row.lines[0]?.nameSnapshot;
          const source = row.source === "APPOINTMENT" ? "Randevu" : "Tezgah";
          put(
            "Sale",
            row.id,
            [
              customer,
              service,
              `${row.totalAmount.toFixed(2)} ${row.currency}`,
              source,
            ]
              .filter(Boolean)
              .join(" · "),
          );
        }
      }),
      this.loadNamed(businessId, byType.get("Collection"), async (ids) => {
        const rows = await this.prisma.collection.findMany({
          where: { businessId, id: { in: ids } },
          select: {
            id: true,
            amount: true,
            method: true,
            customer: { select: { firstName: true, lastName: true } },
            cashAccount: { select: { name: true } },
          },
        });
        for (const row of rows) {
          const customer = `${row.customer.firstName} ${row.customer.lastName}`.trim();
          put(
            "Collection",
            row.id,
            `${customer} · ${row.amount.toFixed(2)} · ${COLLECTION_METHOD[row.method] ?? row.method} · ${row.cashAccount.name}`,
          );
        }
      }),
      this.loadNamed(businessId, byType.get("SalesReceipt"), async (ids) => {
        const rows = await this.prisma.salesReceipt.findMany({
          where: { businessId, id: { in: ids } },
          select: {
            id: true,
            receiptNo: true,
            sale: {
              select: {
                totalAmount: true,
                currency: true,
                customer: { select: { firstName: true, lastName: true } },
                lines: { select: { nameSnapshot: true }, take: 1 },
              },
            },
          },
        });
        for (const row of rows) {
          const customer =
            `${row.sale.customer.firstName} ${row.sale.customer.lastName}`.trim();
          const service = row.sale.lines[0]?.nameSnapshot;
          put(
            "SalesReceipt",
            row.id,
            [
              row.receiptNo,
              customer,
              service,
              `${row.sale.totalAmount.toFixed(2)} ${row.sale.currency}`,
            ]
              .filter(Boolean)
              .join(" · "),
          );
        }
      }),
      this.loadNamed(businessId, byType.get("Expense"), async (ids) => {
        const rows = await this.prisma.expense.findMany({
          where: { businessId, id: { in: ids } },
          select: {
            id: true,
            category: true,
            amount: true,
            currency: true,
            cashAccount: { select: { name: true } },
          },
        });
        for (const row of rows) {
          put(
            "Expense",
            row.id,
            `${EXPENSE_LABEL[row.category] ?? row.category} · ${row.amount.toFixed(2)} ${row.currency} · ${row.cashAccount.name}`,
          );
        }
      }),
      this.loadNamed(businessId, byType.get("CustomerFile"), async (ids) => {
        const rows = await this.prisma.customerFile.findMany({
          where: { businessId, id: { in: ids } },
          select: {
            id: true,
            kind: true,
            originalName: true,
            customer: { select: { firstName: true, lastName: true } },
          },
        });
        for (const row of rows) {
          const customer =
            `${row.customer.firstName} ${row.customer.lastName}`.trim();
          put(
            "CustomerFile",
            row.id,
            `${customer} · ${FILE_KIND[row.kind] ?? row.kind} · ${row.originalName}`,
          );
        }
      }),
      this.loadNamed(businessId, byType.get("OfficialDocument"), async (ids) => {
        const rows = await this.prisma.officialDocument.findMany({
          where: { businessId, id: { in: ids } },
          select: {
            id: true,
            type: true,
            documentNo: true,
            status: true,
            sale: {
              select: {
                customer: { select: { firstName: true, lastName: true } },
                lines: { select: { nameSnapshot: true }, take: 1 },
              },
            },
          },
        });
        for (const row of rows) {
          const type = row.type === "SMM" ? "SMM" : "e-Fatura";
          const customer =
            `${row.sale.customer.firstName} ${row.sale.customer.lastName}`.trim();
          const service = row.sale.lines[0]?.nameSnapshot;
          put(
            "OfficialDocument",
            row.id,
            [type, row.documentNo, customer, service]
              .filter(Boolean)
              .join(" · "),
          );
        }
      }),
      this.loadNamed(
        businessId,
        byType.get("StaffSpecialization"),
        async (ids) => {
          const rows = await this.prisma.staffSpecialization.findMany({
            where: { businessId, id: { in: ids } },
            select: {
              id: true,
              staff: { select: { firstName: true, lastName: true } },
              specialization: { select: { name: true } },
            },
          });
          for (const row of rows) {
            put(
              "StaffSpecialization",
              row.id,
              `${row.staff.firstName} ${row.staff.lastName} · ${row.specialization.name}`,
            );
          }
        },
      ),
      this.loadNamed(businessId, byType.get("Business"), async (ids) => {
        const rows = await this.prisma.business.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        });
        for (const row of rows) put("Business", row.id, row.name);
      }),
      this.loadNamed(businessId, byType.get("Payment"), async (ids) => {
        const rows = await this.prisma.payment.findMany({
          where: { businessId, id: { in: ids } },
          select: { id: true, amount: true, currency: true, status: true },
        });
        for (const row of rows) {
          put(
            "Payment",
            row.id,
            `${row.amount.toFixed(2)} ${row.currency} · ${row.status}`,
          );
        }
      }),
      this.loadNamed(businessId, byType.get("Subscription"), async (ids) => {
        const rows = await this.prisma.subscription.findMany({
          where: { businessId, id: { in: ids } },
          select: {
            id: true,
            status: true,
            plan: { select: { name: true } },
          },
        });
        for (const row of rows) {
          put("Subscription", row.id, `${row.plan.name} · ${row.status}`);
        }
      }),
    ];

    await Promise.all(tasks);

    const result = new Map<string, string>();
    for (const log of logs) {
      const resolved = lookup.get(`${log.entityType}:${log.entityId}`);
      if (resolved) {
        result.set(log.id, resolved);
        continue;
      }
      const fromMeta = summaryFromMetadata(log.metadata);
      if (fromMeta) result.set(log.id, fromMeta);
    }
    return result;
  }

  private async loadNamed(
    _businessId: string,
    ids: string[] | undefined,
    loader: (ids: string[]) => Promise<void>,
  ): Promise<void> {
    if (!ids?.length) return;
    const unique = [...new Set(ids)];
    try {
      await loader(unique);
    } catch {
      // Keep listing resilient if a related row cannot be resolved.
    }
  }
}

function summaryFromMetadata(metadata: Prisma.JsonValue): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const data = metadata as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof data.receiptNo === "string") parts.push(data.receiptNo);
  if (typeof data.customerName === "string") parts.push(data.customerName);
  if (typeof data.serviceName === "string") parts.push(data.serviceName);
  if (typeof data.amount === "string" || typeof data.amount === "number") {
    parts.push(String(data.amount));
  }
  if (typeof data.name === "string") parts.push(data.name);
  if (typeof data.summary === "string") parts.push(data.summary);
  if (typeof data.from === "string" && typeof data.to === "string") {
    parts.push(`${data.from} → ${data.to}`);
  }
  return parts.length ? parts.join(" · ") : null;
}
