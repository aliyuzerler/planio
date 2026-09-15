import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@xenior/database";
import type { ServiceProfile, UpdateServiceInput } from "@xenior/types";
import { AuditLogService } from "../audit/audit-log.service";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { SubscriptionAccessService } from "../subscriptions/subscription-access.service";
import {
  CreateServiceDto,
  ListServicesQueryDto,
  UpdateServiceDto,
} from "./dto/service.dto";

const serviceInclude = { business: { select: { currency: true } } };
type Database = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
    private readonly subscriptionAccess: SubscriptionAccessService,
  ) {}

  async list(query: ListServicesQueryDto): Promise<ServiceProfile[]> {
    const { businessId } = this.requestContext.requireTenant();
    const services = await this.prisma.service.findMany({
      where: {
        businessId,
        isActive: query.isActive,
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: "insensitive" } },
                { description: { contains: query.q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: serviceInclude,
      orderBy: { name: "asc" },
    });
    return services.map((service) => this.toProfile(service));
  }

  async get(id: string): Promise<ServiceProfile> {
    const { businessId } = this.requestContext.requireTenant();
    return this.toProfile(await this.findService(this.prisma, businessId, id));
  }

  async create(input: CreateServiceDto): Promise<ServiceProfile> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const service = await transaction.service.create({
          data: {
            businessId,
            name: input.name,
            description: input.description,
            durationMinutes: input.durationMinutes,
            price: input.price,
          },
          include: serviceInclude,
        });
        await this.auditLog.record(
          {
            businessId,
            userId: authorization?.user.userId,
            action: "SERVICE_CREATED",
            entityType: "Service",
            entityId: service.id,
            metadata: {
              fields: [
                "name",
                "durationMinutes",
                "price",
                ...(input.description !== undefined ? ["description"] : []),
              ],
            },
          },
          transaction,
        );
        return this.toProfile(service);
      });
    } catch (error) {
      this.throwNameConflict(error);
      throw error;
    }
  }

  async update(id: string, input: UpdateServiceDto): Promise<ServiceProfile> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    const changedFields = Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key) as (keyof UpdateServiceInput)[];
    if (changedFields.length === 0) {
      throw new BadRequestException({
        message: "At least one service field must be provided.",
        code: "EMPTY_UPDATE",
      });
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        await this.findService(transaction, businessId, id);
        const service = await transaction.service.update({
          where: { id },
          data: {
            name: input.name,
            description: input.description,
            durationMinutes: input.durationMinutes,
            price: input.price,
            isActive: input.isActive,
          },
          include: serviceInclude,
        });
        await this.auditLog.record(
          {
            businessId,
            userId: authorization?.user.userId,
            action: "SERVICE_UPDATED",
            entityType: "Service",
            entityId: id,
            metadata: { fields: changedFields },
          },
          transaction,
        );
        return this.toProfile(service);
      });
    } catch (error) {
      this.throwNameConflict(error);
      throw error;
    }
  }

  async deactivate(id: string): Promise<void> {
    await this.update(id, { isActive: false });
  }

  private async findService(
    database: Database,
    businessId: string,
    id: string,
  ) {
    const service = await database.service.findFirst({
      where: { id, businessId },
      include: serviceInclude,
    });
    if (!service) {
      throw new NotFoundException({
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    return service;
  }

  private throwNameConflict(error: unknown): void {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new ConflictException({
        message: "A service with this name already exists.",
        code: "SERVICE_NAME_EXISTS",
      });
    }
  }

  private toProfile(service: {
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    price: { toFixed: (digits: number) => string };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    business: { currency: string };
  }): ServiceProfile {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      price: service.price.toFixed(2),
      currency: service.business.currency,
      isActive: service.isActive,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    };
  }
}
