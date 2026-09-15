import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@xenior/database";
import type { ResourceProfile, UpdateResourceInput } from "@xenior/types";
import { AuditLogService } from "../audit/audit-log.service";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { SubscriptionAccessService } from "../subscriptions/subscription-access.service";
import {
  CreateResourceDto,
  ListResourcesQueryDto,
  UpdateResourceDto,
} from "./dto/resource.dto";

type Database = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
    private readonly subscriptionAccess: SubscriptionAccessService,
  ) {}

  async list(query: ListResourcesQueryDto): Promise<ResourceProfile[]> {
    const { businessId } = this.requestContext.requireTenant();
    const resources = await this.prisma.resource.findMany({
      where: {
        businessId,
        isActive: query.isActive,
        ...(query.q
          ? { name: { contains: query.q, mode: "insensitive" as const } }
          : {}),
      },
      orderBy: { name: "asc" },
    });
    return resources.map((resource) => this.toProfile(resource));
  }

  async get(id: string): Promise<ResourceProfile> {
    const { businessId } = this.requestContext.requireTenant();
    return this.toProfile(await this.findResource(this.prisma, businessId, id));
  }

  async create(input: CreateResourceDto): Promise<ResourceProfile> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const resource = await transaction.resource.create({
          data: {
            businessId,
            name: input.name,
          },
        });
        await this.auditLog.record(
          {
            businessId,
            userId: authorization?.user.userId,
            action: "RESOURCE_CREATED",
            entityType: "Resource",
            entityId: resource.id,
            metadata: { fields: ["name"] },
          },
          transaction,
        );
        return this.toProfile(resource);
      });
    } catch (error) {
      this.throwNameConflict(error);
      throw error;
    }
  }

  async update(id: string, input: UpdateResourceDto): Promise<ResourceProfile> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    const changedFields = Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key) as (keyof UpdateResourceInput)[];
    if (changedFields.length === 0) {
      throw new BadRequestException({
        message: "At least one resource field must be provided.",
        code: "EMPTY_UPDATE",
      });
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        await this.findResource(transaction, businessId, id);
        const resource = await transaction.resource.update({
          where: { id },
          data: {
            name: input.name,
            isActive: input.isActive,
          },
        });
        await this.auditLog.record(
          {
            businessId,
            userId: authorization?.user.userId,
            action: "RESOURCE_UPDATED",
            entityType: "Resource",
            entityId: id,
            metadata: { fields: changedFields },
          },
          transaction,
        );
        return this.toProfile(resource);
      });
    } catch (error) {
      this.throwNameConflict(error);
      throw error;
    }
  }

  async deactivate(id: string): Promise<void> {
    await this.update(id, { isActive: false });
  }

  private async findResource(
    database: Database,
    businessId: string,
    id: string,
  ) {
    const resource = await database.resource.findFirst({
      where: { id, businessId },
    });
    if (!resource) {
      throw new NotFoundException({
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    return resource;
  }

  private throwNameConflict(error: unknown): void {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new ConflictException({
        message: "A resource with this name already exists.",
        code: "RESOURCE_NAME_EXISTS",
      });
    }
  }

  private toProfile(resource: {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ResourceProfile {
    return {
      id: resource.id,
      name: resource.name,
      isActive: resource.isActive,
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
    };
  }
}
