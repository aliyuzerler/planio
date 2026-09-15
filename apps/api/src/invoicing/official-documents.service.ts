import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { OFFICIAL_DOCUMENT_CANCEL_POLICY, type OfficialDocumentRecord } from "@xenior/types";
import { AuditLogService } from "../audit/audit-log.service";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { NotificationDispatcherService } from "../notifications/notification-dispatcher.service";
import { SubscriptionAccessService } from "../subscriptions/subscription-access.service";
import { IssueOfficialDocumentDto } from "./dto/invoicing.dto";
import { UyumsoftIssuer } from "./uyumsoft.issuer";

@Injectable()
export class OfficialDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
    private readonly issuer: UyumsoftIssuer,
    private readonly subscriptionAccess: SubscriptionAccessService,
    @Optional() private readonly dispatcher?: NotificationDispatcherService,
  ) {}

  async get(saleId: string): Promise<OfficialDocumentRecord> {
    const { businessId } = this.requestContext.requireTenant();
    const document = await this.prisma.officialDocument.findFirst({
      where: { saleId, businessId },
    });
    if (!document) {
      throw new NotFoundException({
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    return this.toRecord(document);
  }

  async issue(
    saleId: string,
    input: IssueOfficialDocumentDto,
  ): Promise<OfficialDocumentRecord> {
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

    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, businessId: tenant.businessId },
      include: {
        receipt: { select: { receiptNo: true } },
        officialDocument: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            smsConsent: true,
            emailConsent: true,
          },
        },
        business: { select: { name: true } },
      },
    });
    if (!sale) {
      throw new NotFoundException({
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    if (!sale.receipt) {
      throw new BadRequestException({
        message: "Internal sales receipt is required before an official document.",
        code: "RECEIPT_REQUIRED",
      });
    }
    if (sale.officialDocument?.status === "ISSUED") {
      if (sale.officialDocument.type !== input.type) {
        throw new ConflictException({
          message: "An official document already exists for this sale.",
          code: "OFFICIAL_DOCUMENT_EXISTS",
        });
      }
      return this.toRecord(sale.officialDocument);
    }

    const settings = await this.prisma.tenantUyumsoftSettings.findUnique({
      where: { businessId: tenant.businessId },
    });
    const provider = settings?.provider ?? "GENERIC";

    const document = await this.prisma.$transaction(async (transaction) => {
      const business = await transaction.business.update({
        where: { id: tenant.businessId },
        data: { officialDocumentSequence: { increment: 1 } },
        select: { officialDocumentSequence: true },
      });
      const issued = this.issuer.issue({
        type: input.type,
        provider,
        hasCredentials: Boolean(settings?.credentialsCipher),
        sequence: business.officialDocumentSequence,
        receiptNo: sale.receipt!.receiptNo,
        saleId: sale.id,
        totalAmount: sale.totalAmount.toFixed(2),
        currency: sale.currency,
      });
      const data = {
        type: input.type,
        status: issued.ok ? ("ISSUED" as const) : ("FAILED" as const),
        documentNo: issued.documentNo ?? null,
        pdfUrl: issued.pdfUrl ?? null,
        errorCode: issued.errorCode ?? null,
        errorMessage: issued.errorMessage ?? null,
        cancelPolicy: OFFICIAL_DOCUMENT_CANCEL_POLICY,
        issuedAt: issued.ok ? new Date() : null,
        issuedByUserId: actorId,
      };
      const row = sale.officialDocument
        ? await transaction.officialDocument.update({
            where: { id: sale.officialDocument.id },
            data,
          })
        : await transaction.officialDocument.create({
            data: {
              businessId: tenant.businessId,
              saleId: sale.id,
              ...data,
            },
          });
      await this.auditLog.record(
        {
          businessId: tenant.businessId,
          userId: actorId,
          action: issued.ok ? "OFFICIAL_DOCUMENT_ISSUED" : "OFFICIAL_DOCUMENT_FAILED",
          entityType: "OfficialDocument",
          entityId: row.id,
          metadata: { fields: ["type", "status", "documentNo", "errorCode"] },
        },
        transaction,
      );
      return row;
    });

    if (document.status === "ISSUED" && document.documentNo) {
      await this.dispatcher?.queueOfficialDocument({
        businessId: tenant.businessId,
        customer: sale.customer,
        businessName: sale.business.name,
        type: input.type,
        documentNo: document.documentNo,
      });
    }

    return this.toRecord(document);
  }

  private toRecord(row: {
    id: string;
    saleId: string;
    type: OfficialDocumentRecord["type"];
    status: OfficialDocumentRecord["status"];
    documentNo: string | null;
    pdfUrl: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    cancelPolicy: string;
    issuedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): OfficialDocumentRecord {
    return {
      id: row.id,
      saleId: row.saleId,
      type: row.type,
      status: row.status,
      documentNo: row.documentNo,
      pdfUrl: row.pdfUrl,
      errorCode: row.errorCode,
      errorMessage: row.errorMessage,
      cancelPolicy: row.cancelPolicy,
      issuedAt: row.issuedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
