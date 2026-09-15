import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@xenior/database";
import type {
  CollectionMethod,
  PaginatedResponse,
  SaleRecord,
  SalesReceiptRecord,
} from "@xenior/types";
import { AuditLogService } from "../audit/audit-log.service";
import { CampaignsService } from "../campaigns/campaigns.service";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { SubscriptionAccessService } from "../subscriptions/subscription-access.service";
import { CashAccountsService } from "./cash-accounts.service";
import {
  CreateCollectionDto,
  CreateCounterSaleDto,
  ListSalesQueryDto,
} from "./dto/ledger.dto";
import { fromCents, remainingAmount, toCents } from "./money";
import { renderSalesReceiptHtml } from "./receipt-html";

type Database = PrismaService | Prisma.TransactionClient;

const saleInclude = {
  customer: { select: { id: true, firstName: true, lastName: true } },
  staff: { select: { id: true, firstName: true, lastName: true } },
  lines: { orderBy: { nameSnapshot: "asc" as const } },
  collections: {
    include: { cashAccount: { select: { id: true, name: true } } },
    orderBy: { collectedAt: "asc" as const },
  },
  receipt: { select: { id: true, receiptNo: true, sequence: true, issuedAt: true } },
  officialDocument: {
    select: {
      id: true,
      type: true,
      status: true,
      documentNo: true,
      issuedAt: true,
    },
  },
} satisfies Prisma.SaleInclude;

type SaleWithRelations = Prisma.SaleGetPayload<{ include: typeof saleInclude }>;

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
    private readonly campaigns: CampaignsService,
    private readonly cashAccounts: CashAccountsService,
    private readonly subscriptionAccess: SubscriptionAccessService,
  ) {}

  async list(query: ListSalesQueryDto): Promise<PaginatedResponse<SaleRecord>> {
    const tenant = this.requestContext.requireTenant();
    const staffId = await this.staffFilter(
      tenant.businessId,
      tenant.role,
      tenant.businessUserId,
      query.staffId,
    );
    const where: Prisma.SaleWhereInput = {
      businessId: tenant.businessId,
      customerId: query.customerId,
      appointmentId: query.appointmentId,
      staffId,
      status: query.status,
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: saleInclude,
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.sale.count({ where }),
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

  async get(id: string): Promise<SaleRecord> {
    const tenant = this.requestContext.requireTenant();
    const sale = await this.findSale(this.prisma, tenant.businessId, id);
    await this.assertStaffMayRead(tenant, sale.staffId);
    return this.toRecord(sale);
  }

  async createCounterSale(input: CreateCounterSaleDto): Promise<SaleRecord> {
    const authorization = this.requestContext.get();
    const tenant = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(tenant.businessId);
    const actorId = authorization?.user.userId;
    if (!actorId) {
      throw new BadRequestException({
        message: "Authenticated user is required.",
        code: "UNAUTHENTICATED",
      });
    }
    return this.prisma.$transaction(async (transaction) => {
      const [customer, service, staff, business] = await Promise.all([
        transaction.customer.findFirst({
          where: { id: input.customerId, businessId: tenant.businessId, isActive: true },
        }),
        transaction.service.findFirst({
          where: { id: input.serviceId, businessId: tenant.businessId, isActive: true },
        }),
        input.staffId
          ? transaction.staff.findFirst({
              where: { id: input.staffId, businessId: tenant.businessId, isActive: true },
            })
          : Promise.resolve(null),
        transaction.business.findFirst({
          where: { id: tenant.businessId },
          select: { currency: true, timezone: true },
        }),
      ]);
      if (!customer || !service || !business || (input.staffId && !staff)) {
        throw new BadRequestException({
          message: "Sale targets do not belong to this business.",
          code: "INVALID_SALE_TARGET",
        });
      }
      const priced = await this.campaigns.resolveForService(
        transaction,
        tenant.businessId,
        service.id,
        new Date(),
        service.price.toFixed(2),
      );
      const sale = await this.writeSale(transaction, {
        businessId: tenant.businessId,
        customerId: customer.id,
        staffId: staff?.id ?? null,
        createdByUserId: actorId,
        source: "COUNTER",
        currency: business.currency,
        totalAmount: priced.payableAmount,
        listPriceSnapshot: priced.listPrice,
        discountAmountSnapshot: priced.discountAmount,
        campaignId: priced.campaignId,
        campaignNameSnapshot: priced.campaignName,
        notes: input.notes ?? null,
        line: {
          serviceId: service.id,
          nameSnapshot: service.name,
          unitPrice: priced.payableAmount,
          lineTotal: priced.payableAmount,
          listPriceSnapshot: priced.listPrice,
          discountAmountSnapshot: priced.discountAmount,
        },
        description: `${service.name} satışı`,
      });
      await this.auditLog.record(
        {
          businessId: tenant.businessId,
          userId: actorId,
          action: "SALE_CREATED",
          entityType: "Sale",
          entityId: sale.id,
          metadata: { fields: ["source", "totalAmount"] },
        },
        transaction,
      );
      return this.toRecord(
        await this.findSale(transaction, tenant.businessId, sale.id),
      );
    });
  }

  async collect(saleId: string, input: CreateCollectionDto): Promise<SaleRecord> {
    const authorization = this.requestContext.get();
    const tenant = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(tenant.businessId);
    const actorId = authorization?.user.userId;
    if (!actorId) {
      throw new BadRequestException({
        message: "Authenticated user is required.",
        code: "UNAUTHENTICATED",
      });
    }
    const amountCents = toCents(input.amount);
    if (amountCents <= 0) {
      throw new BadRequestException({
        message: "Collection must be greater than zero.",
        code: "INVALID_COLLECTION",
      });
    }
    return this.prisma.$transaction(async (transaction) => {
      return this.toRecord(
        await this.applyCollection(transaction, {
          businessId: tenant.businessId,
          saleId,
          amount: input.amount,
          method: input.method ?? "CASH",
          notes: input.notes ?? null,
          collectedByUserId: actorId,
          cashAccountId: input.cashAccountId,
        }),
      );
    });
  }

  async applyCollection(
    database: Database,
    input: {
      businessId: string;
      saleId: string;
      amount: string;
      method: CollectionMethod;
      notes: string | null;
      collectedByUserId: string;
      cashAccountId?: string;
    },
  ): Promise<SaleWithRelations> {
    const amountCents = toCents(input.amount);
    const sale = await this.findSale(database, input.businessId, input.saleId);
    const remaining = toCents(
      remainingAmount(
        sale.totalAmount.toFixed(2),
        sale.collectedAmount.toFixed(2),
      ),
    );
    if (amountCents <= 0 || amountCents > remaining) {
      throw new BadRequestException({
        message: "Collection cannot exceed the remaining balance.",
        code: "COLLECTION_EXCEEDS_REMAINING",
      });
    }
    const account = await this.cashAccounts.resolveAccount(
      database,
      input.businessId,
      input.cashAccountId,
    );
    const collected = fromCents(
      toCents(sale.collectedAmount.toFixed(2)) + amountCents,
    );
    const settled = toCents(collected) >= toCents(sale.totalAmount.toFixed(2));
    const collection = await database.collection.create({
      data: {
        businessId: input.businessId,
        saleId: sale.id,
        cashAccountId: account.id,
        customerId: sale.customerId,
        collectedByUserId: input.collectedByUserId,
        amount: input.amount,
        method: input.method,
        notes: input.notes,
      },
    });
    await database.sale.update({
      where: { id: sale.id },
      data: {
        collectedAmount: collected,
        status: settled ? "SETTLED" : "OPEN",
      },
    });
    const customer = await database.customer.update({
      where: { id: sale.customerId },
      data: { ledgerBalance: { decrement: input.amount } },
    });
    await database.customerLedgerEntry.create({
      data: {
        businessId: input.businessId,
        customerId: sale.customerId,
        saleId: sale.id,
        collectionId: collection.id,
        type: "COLLECTION",
        amount: fromCents(-amountCents),
        balanceAfter: customer.ledgerBalance,
        description: `${this.methodLabel(input.method)} · ${account.name}`,
        occurredAt: collection.collectedAt,
      },
    });
    if (sale.appointmentId) {
      await database.appointment.update({
        where: { id: sale.appointmentId },
        data: { paymentStatus: settled ? "PAID" : "PARTIAL" },
      });
    }
    await this.auditLog.record(
      {
        businessId: input.businessId,
        userId: input.collectedByUserId,
        action: "COLLECTION_CREATED",
        entityType: "Collection",
        entityId: collection.id,
        metadata: { fields: ["amount", "saleId", "method"] },
      },
      database,
    );
    return this.findSale(database, input.businessId, sale.id);
  }

  async issueReceipt(saleId: string): Promise<SalesReceiptRecord> {
    const authorization = this.requestContext.get();
    const tenant = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(tenant.businessId);
    const actorId = authorization?.user.userId;
    if (!actorId) {
      throw new BadRequestException({
        message: "Authenticated user is required.",
        code: "UNAUTHENTICATED",
      });
    }
    return this.prisma.$transaction(async (transaction) => {
      const sale = await this.findSale(transaction, tenant.businessId, saleId);
      if (sale.receipt) {
        return this.toReceipt(this.toRecord(sale), sale.receipt, tenant.businessId);
      }
      const business = await transaction.business.update({
        where: { id: tenant.businessId },
        data: { receiptSequence: { increment: 1 } },
        select: { name: true, receiptSequence: true },
      });
      const receipt = await transaction.salesReceipt.create({
        data: {
          businessId: tenant.businessId,
          saleId: sale.id,
          issuedByUserId: actorId,
          sequence: business.receiptSequence,
          receiptNo: `FIS-${new Date().getFullYear()}-${String(business.receiptSequence).padStart(5, "0")}`,
        },
      });
      await this.auditLog.record(
        {
          businessId: tenant.businessId,
          userId: actorId,
          action: "SALES_RECEIPT_ISSUED",
          entityType: "SalesReceipt",
          entityId: receipt.id,
          metadata: { fields: ["receiptNo"] },
        },
        transaction,
      );
      const record = this.toRecord({
        ...sale,
        receipt: {
          id: receipt.id,
          receiptNo: receipt.receiptNo,
          sequence: receipt.sequence,
          issuedAt: receipt.issuedAt,
        },
      });
      return {
        id: receipt.id,
        saleId: sale.id,
        receiptNo: receipt.receiptNo,
        sequence: receipt.sequence,
        issuedAt: receipt.issuedAt.toISOString(),
        html: renderSalesReceiptHtml(record, receipt.receiptNo, business.name),
      };
    });
  }

  async getReceipt(saleId: string): Promise<SalesReceiptRecord> {
    const tenant = this.requestContext.requireTenant();
    const sale = await this.findSale(this.prisma, tenant.businessId, saleId);
    await this.assertStaffMayRead(tenant, sale.staffId);
    if (!sale.receipt) {
      throw new NotFoundException({
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    return this.toReceipt(this.toRecord(sale), sale.receipt, tenant.businessId);
  }

  async ensureForAppointment(
    database: Database,
    appointment: {
      id: string;
      businessId: string;
      customerId: string;
      staffId: string;
      serviceId: string;
      createdByUserId: string;
      serviceNameSnapshot: string;
      servicePriceSnapshot: { toFixed(digits: number): string };
      listPriceSnapshot: { toFixed(digits: number): string };
      discountAmountSnapshot: { toFixed(digits: number): string };
      campaignId: string | null;
      campaignNameSnapshot: string | null;
      currency: string;
    },
    actorUserId: string,
    occurredAt = new Date(),
  ): Promise<{ id: string }> {
    const existing = await database.sale.findFirst({
      where: { appointmentId: appointment.id, businessId: appointment.businessId },
      select: { id: true },
    });
    if (existing) return existing;
    return this.writeAppointmentSale(database, appointment, actorUserId, occurredAt);
  }

  async recordForCompletedAppointment(
    database: Database,
    appointment: {
      id: string;
      businessId: string;
      customerId: string;
      staffId: string;
      serviceId: string;
      createdByUserId: string;
      serviceNameSnapshot: string;
      servicePriceSnapshot: { toFixed(digits: number): string };
      listPriceSnapshot: { toFixed(digits: number): string };
      discountAmountSnapshot: { toFixed(digits: number): string };
      campaignId: string | null;
      campaignNameSnapshot: string | null;
      currency: string;
    },
    actorUserId: string,
    occurredAt: Date,
  ): Promise<void> {
    try {
      await this.writeAppointmentSale(database, appointment, actorUserId, occurredAt);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        return;
      }
      throw error;
    }
  }

  private async writeAppointmentSale(
    database: Database,
    appointment: {
      id: string;
      businessId: string;
      customerId: string;
      staffId: string;
      serviceId: string;
      createdByUserId: string;
      serviceNameSnapshot: string;
      servicePriceSnapshot: { toFixed(digits: number): string };
      listPriceSnapshot: { toFixed(digits: number): string };
      discountAmountSnapshot: { toFixed(digits: number): string };
      campaignId: string | null;
      campaignNameSnapshot: string | null;
      currency: string;
    },
    actorUserId: string,
    occurredAt: Date,
  ) {
    const payable = appointment.servicePriceSnapshot.toFixed(2);
    return this.writeSale(database, {
      businessId: appointment.businessId,
      customerId: appointment.customerId,
      appointmentId: appointment.id,
      staffId: appointment.staffId,
      createdByUserId: actorUserId || appointment.createdByUserId,
      source: "APPOINTMENT",
      currency: appointment.currency,
      totalAmount: payable,
      listPriceSnapshot: appointment.listPriceSnapshot.toFixed(2),
      discountAmountSnapshot: appointment.discountAmountSnapshot.toFixed(2),
      campaignId: appointment.campaignId,
      campaignNameSnapshot: appointment.campaignNameSnapshot,
      notes: null,
      line: {
        serviceId: appointment.serviceId,
        nameSnapshot: appointment.serviceNameSnapshot,
        unitPrice: payable,
        lineTotal: payable,
        listPriceSnapshot: appointment.listPriceSnapshot.toFixed(2),
        discountAmountSnapshot: appointment.discountAmountSnapshot.toFixed(2),
      },
      description: `${appointment.serviceNameSnapshot} randevu satışı`,
      occurredAt,
    });
  }

  private async writeSale(
    database: Database,
    input: {
      businessId: string;
      customerId: string;
      appointmentId?: string;
      staffId: string | null;
      createdByUserId: string;
      source: "APPOINTMENT" | "COUNTER";
      currency: string;
      totalAmount: string;
      listPriceSnapshot: string;
      discountAmountSnapshot: string;
      campaignId: string | null;
      campaignNameSnapshot: string | null;
      notes: string | null;
      line: {
        serviceId: string;
        nameSnapshot: string;
        unitPrice: string;
        lineTotal: string;
        listPriceSnapshot: string;
        discountAmountSnapshot: string;
      };
      description: string;
      occurredAt?: Date;
    },
  ) {
    const sale = await database.sale.create({
      data: {
        businessId: input.businessId,
        customerId: input.customerId,
        appointmentId: input.appointmentId,
        staffId: input.staffId,
        createdByUserId: input.createdByUserId,
        source: input.source,
        status: "OPEN",
        currency: input.currency,
        totalAmount: input.totalAmount,
        collectedAmount: "0.00",
        listPriceSnapshot: input.listPriceSnapshot,
        discountAmountSnapshot: input.discountAmountSnapshot,
        campaignId: input.campaignId,
        campaignNameSnapshot: input.campaignNameSnapshot,
        notes: input.notes,
        lines: {
          create: {
            businessId: input.businessId,
            serviceId: input.line.serviceId,
            nameSnapshot: input.line.nameSnapshot,
            quantity: 1,
            unitPrice: input.line.unitPrice,
            lineTotal: input.line.lineTotal,
            listPriceSnapshot: input.line.listPriceSnapshot,
            discountAmountSnapshot: input.line.discountAmountSnapshot,
          },
        },
      },
    });
    const occurredAt = input.occurredAt ?? sale.createdAt;
    const customer = await database.customer.update({
      where: { id: input.customerId },
      data: { ledgerBalance: { increment: input.totalAmount } },
    });
    await database.customerLedgerEntry.create({
      data: {
        businessId: input.businessId,
        customerId: input.customerId,
        saleId: sale.id,
        type: "SALE",
        amount: input.totalAmount,
        balanceAfter: customer.ledgerBalance,
        description: input.description,
        occurredAt,
      },
    });
    return sale;
  }

  private async findSale(database: Database, businessId: string, id: string) {
    const sale = await database.sale.findFirst({
      where: { id, businessId },
      include: saleInclude,
    });
    if (!sale) {
      throw new NotFoundException({
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    return sale;
  }

  private async staffFilter(
    businessId: string,
    role: string | null,
    businessUserId: string | null,
    requestedStaffId?: string,
  ): Promise<string | undefined> {
    if (role !== "STAFF") return requestedStaffId;
    if (!businessUserId) {
      throw new ForbiddenException({
        message: "Staff profile is required to view sales.",
        code: "STAFF_PROFILE_REQUIRED",
      });
    }
    const staff = await this.prisma.staff.findFirst({
      where: { businessId, businessUserId },
      select: { id: true },
    });
    if (!staff) {
      throw new ForbiddenException({
        message: "Staff profile is required to view sales.",
        code: "STAFF_PROFILE_REQUIRED",
      });
    }
    if (requestedStaffId && requestedStaffId !== staff.id) {
      throw new ForbiddenException({
        message: "Staff can only view their own sales.",
        code: "INSUFFICIENT_BUSINESS_ROLE",
      });
    }
    return staff.id;
  }

  private async assertStaffMayRead(
    tenant: {
      businessId: string;
      role: string | null;
      businessUserId: string | null;
    },
    saleStaffId: string | null,
  ): Promise<void> {
    if (tenant.role !== "STAFF") return;
    const allowed = await this.staffFilter(
      tenant.businessId,
      tenant.role,
      tenant.businessUserId,
    );
    if (saleStaffId !== allowed) {
      throw new ForbiddenException({
        message: "Staff can only view their own sales.",
        code: "INSUFFICIENT_BUSINESS_ROLE",
      });
    }
  }

  private async toReceipt(
    sale: SaleRecord,
    receipt: { id: string; receiptNo: string; sequence: number; issuedAt: Date },
    businessId: string,
  ): Promise<SalesReceiptRecord> {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId },
      select: { name: true },
    });
    return {
      id: receipt.id,
      saleId: sale.id,
      receiptNo: receipt.receiptNo,
      sequence: receipt.sequence,
      issuedAt: receipt.issuedAt.toISOString(),
      html: renderSalesReceiptHtml(sale, receipt.receiptNo, business?.name ?? "Planio"),
    };
  }

  private methodLabel(method: CollectionMethod): string {
    if (method === "CARD") return "POS tahsilat";
    if (method === "LINK") return "Link tahsilatı";
    return "Nakit tahsilat";
  }

  private toRecord(sale: SaleWithRelations): SaleRecord {
    return {
      id: sale.id,
      customer: sale.customer,
      staff: sale.staff,
      appointmentId: sale.appointmentId,
      source: sale.source,
      status: sale.status,
      currency: sale.currency,
      totalAmount: sale.totalAmount.toFixed(2),
      collectedAmount: sale.collectedAmount.toFixed(2),
      remainingAmount: remainingAmount(
        sale.totalAmount.toFixed(2),
        sale.collectedAmount.toFixed(2),
      ),
      listPriceSnapshot: sale.listPriceSnapshot.toFixed(2),
      discountAmountSnapshot: sale.discountAmountSnapshot.toFixed(2),
      campaignId: sale.campaignId,
      campaignNameSnapshot: sale.campaignNameSnapshot,
      notes: sale.notes,
      createdAt: sale.createdAt.toISOString(),
      updatedAt: sale.updatedAt.toISOString(),
      lines: sale.lines.map((line) => ({
        id: line.id,
        serviceId: line.serviceId,
        nameSnapshot: line.nameSnapshot,
        quantity: line.quantity,
        unitPrice: line.unitPrice.toFixed(2),
        lineTotal: line.lineTotal.toFixed(2),
        listPriceSnapshot: line.listPriceSnapshot.toFixed(2),
        discountAmountSnapshot: line.discountAmountSnapshot.toFixed(2),
      })),
      collections: sale.collections.map((item) => ({
        id: item.id,
        saleId: item.saleId,
        cashAccountId: item.cashAccountId,
        cashAccountName: item.cashAccount.name,
        customerId: item.customerId,
        amount: item.amount.toFixed(2),
        method: item.method,
        notes: item.notes,
        collectedAt: item.collectedAt.toISOString(),
      })),
      receipt: sale.receipt
        ? {
            id: sale.receipt.id,
            receiptNo: sale.receipt.receiptNo,
            issuedAt: sale.receipt.issuedAt.toISOString(),
          }
        : null,
      officialDocument: sale.officialDocument
        ? {
            id: sale.officialDocument.id,
            type: sale.officialDocument.type,
            status: sale.officialDocument.status,
            documentNo: sale.officialDocument.documentNo,
            issuedAt: sale.officialDocument.issuedAt?.toISOString() ?? null,
          }
        : null,
    };
  }
}
