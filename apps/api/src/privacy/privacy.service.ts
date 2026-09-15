import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import type { DataExportRecord, DataRequestRecord } from "@xenior/types";
import { AuditLogService } from "../audit/audit-log.service";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { PrivacyQueueService } from "./privacy-queue.service";

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
    private readonly eraseQueue: PrivacyQueueService,
  ) {}

  async exportData(): Promise<DataExportRecord> {
    const tenant = this.requestContext.requireTenant();
    const actorId = this.requestContext.get()?.user.userId;
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: tenant.businessId },
      select: { id: true, name: true, email: true, phone: true },
    });
    const [customers, appointments] = await Promise.all([
      this.prisma.customer.findMany({
        where: { businessId: tenant.businessId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.appointment.findMany({
        where: { businessId: tenant.businessId },
        select: {
          id: true,
          startAt: true,
          status: true,
          serviceNameSnapshot: true,
        },
        orderBy: { startAt: "desc" },
        take: 1000,
      }),
    ]);

    if (actorId) {
      await this.prisma.dataRequest.create({
        data: {
          businessId: tenant.businessId,
          userId: actorId,
          type: "EXPORT",
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    }

    return {
      business,
      customers,
      appointments: appointments.map((item) => ({
        id: item.id,
        startAt: item.startAt.toISOString(),
        status: item.status,
        serviceNameSnapshot: item.serviceNameSnapshot,
      })),
    };
  }

  async requestErase(): Promise<DataRequestRecord> {
    const tenant = this.requestContext.requireTenant();
    const actorId = this.requestContext.get()?.user.userId;
    if (!actorId) {
      throw new UnauthorizedException({
        message: "Authentication is required.",
        code: "UNAUTHENTICATED",
      });
    }
    const request = await this.prisma.dataRequest.create({
      data: {
        businessId: tenant.businessId,
        userId: actorId,
        type: "ERASE",
        status: "PENDING",
      },
    });
    await this.eraseQueue.enqueueSafely(request.id, tenant.businessId);
    return this.processErase(request.id);
  }

  async processErase(requestId: string): Promise<DataRequestRecord> {
    const request = await this.prisma.dataRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.type !== "ERASE") {
      this.logger.warn(`Skipping erase job for ${requestId}`);
      return this.toRecord(
        request ?? {
          id: requestId,
          type: "ERASE" as const,
          status: "PENDING" as const,
          createdAt: new Date(),
          completedAt: null,
        },
      );
    }
    if (request.status === "COMPLETED") {
      return this.toRecord(request);
    }

    await this.prisma.customer.updateMany({
      where: { businessId: request.businessId },
      data: {
        firstName: "Anonim",
        lastName: "Musteri",
        phone: null,
        email: null,
        birthDate: null,
        notes: null,
        smsConsent: false,
        whatsappConsent: false,
        emailConsent: false,
      },
    });

    const claimed = await this.prisma.dataRequest.updateMany({
      where: { id: request.id, type: "ERASE", status: "PENDING" },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
    if (claimed.count === 1) {
      await this.auditLog.record({
        businessId: request.businessId,
        userId: request.userId,
        action: "DATA_ERASE_COMPLETED",
        entityType: "DataRequest",
        entityId: request.id,
      });
    }

    const completed = await this.prisma.dataRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    return this.toRecord(completed);
  }

  private toRecord(request: {
    id: string;
    type: string;
    status: string;
    createdAt: Date;
    completedAt: Date | null;
  }): DataRequestRecord {
    return {
      id: request.id,
      type: request.type as DataRequestRecord["type"],
      status: request.status as DataRequestRecord["status"],
      createdAt: request.createdAt.toISOString(),
      completedAt: request.completedAt?.toISOString() ?? null,
    };
  }
}
