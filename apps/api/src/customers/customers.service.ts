import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@xenior/database";
import type {
  CustomerAppointmentHistoryItem,
  CustomerFileKind,
  CustomerFileRecord,
  CustomerProfile,
  PaginatedResponse,
  UpdateCustomerInput,
} from "@xenior/types";
import { AuditLogService } from "../audit/audit-log.service";
import { RequestContextService } from "../authorization/request-context.service";
import {
  OBJECT_STORAGE,
  type ObjectStoragePort,
} from "../infrastructure/storage/object-storage.port";
import { StorageObjectNotFoundError } from "../infrastructure/storage/storage-object-not-found.error";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { SubscriptionAccessService } from "../subscriptions/subscription-access.service";
import {
  CUSTOMER_FILE_MAX_BYTES,
  customerFileStorageKey,
  isAllowedCustomerFileType,
} from "./customer-files.constants";
import { detectCustomerFileSignature } from "./customer-file-signature";
import {
  CreateCustomerDto,
  CustomerHistoryQueryDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from "./dto/customer.dto";

type Database = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
    private readonly subscriptionAccess: SubscriptionAccessService,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: ObjectStoragePort,
  ) {}

  async list(
    query: ListCustomersQueryDto,
  ): Promise<PaginatedResponse<CustomerProfile>> {
    const { businessId } = this.requestContext.requireTenant();
    const where = this.buildSearchWhere(businessId, query);
    const skip = (query.page - 1) * query.pageSize;
    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return this.toPage(
      customers.map((customer) => this.toProfile(customer)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async get(id: string): Promise<CustomerProfile> {
    const { businessId } = this.requestContext.requireTenant();
    return this.toProfile(await this.findCustomer(this.prisma, businessId, id));
  }

  async listAppointments(
    id: string,
    query: CustomerHistoryQueryDto,
  ): Promise<PaginatedResponse<CustomerAppointmentHistoryItem>> {
    const { businessId } = this.requestContext.requireTenant();
    await this.findCustomer(this.prisma, businessId, id);
    const where = { businessId, customerId: id };
    const skip = (query.page - 1) * query.pageSize;
    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          staff: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { startAt: "desc" },
        skip,
        take: query.pageSize,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return this.toPage(
      appointments.map((appointment) => ({
        id: appointment.id,
        startAt: appointment.startAt.toISOString(),
        endAt: appointment.endAt.toISOString(),
        status: appointment.status,
        serviceNameSnapshot: appointment.serviceNameSnapshot,
        serviceDurationSnapshot: appointment.serviceDurationSnapshot,
        servicePriceSnapshot: appointment.servicePriceSnapshot.toFixed(2),
        currency: appointment.currency,
        staff: {
          id: appointment.staff.id,
          firstName: appointment.staff.firstName,
          lastName: appointment.staff.lastName,
        },
      })),
      total,
      query.page,
      query.pageSize,
    );
  }

  async create(input: CreateCustomerDto): Promise<CustomerProfile> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertWithinLimit("customers", businessId);
    return this.prisma.$transaction(async (transaction) => {
      const customer = await transaction.customer.create({
        data: {
          businessId,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          email: input.email,
          birthDate: this.toBirthDate(input.birthDate),
          notes: input.notes,
          smsConsent: input.smsConsent ?? true,
          whatsappConsent: input.whatsappConsent ?? true,
          emailConsent: input.emailConsent ?? true,
        },
      });
      await this.auditLog.record(
        {
          businessId,
          userId: authorization?.user.userId,
          action: "CUSTOMER_CREATED",
          entityType: "Customer",
          entityId: customer.id,
          metadata: {
            fields: [
              "firstName",
              "lastName",
              ...(input.phone !== undefined ? ["phone"] : []),
              ...(input.email !== undefined ? ["email"] : []),
              ...(input.birthDate !== undefined ? ["birthDate"] : []),
              ...(input.notes !== undefined ? ["notes"] : []),
            ],
          },
        },
        transaction,
      );
      return this.toProfile(customer);
    });
  }

  async update(id: string, input: UpdateCustomerDto): Promise<CustomerProfile> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    const changedFields = Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key) as (keyof UpdateCustomerInput)[];
    if (changedFields.length === 0) {
      throw new BadRequestException({
        message: "At least one customer field must be provided.",
        code: "EMPTY_UPDATE",
      });
    }

    return this.prisma.$transaction(async (transaction) => {
      await this.findCustomer(transaction, businessId, id);
      const customer = await transaction.customer.update({
        where: { id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          email: input.email,
          birthDate:
            input.birthDate === undefined
              ? undefined
              : this.toBirthDate(input.birthDate),
          notes: input.notes,
          smsConsent: input.smsConsent,
          whatsappConsent: input.whatsappConsent,
          emailConsent: input.emailConsent,
          isActive: input.isActive,
        },
      });
      await this.auditLog.record(
        {
          businessId,
          userId: authorization?.user.userId,
          action: "CUSTOMER_UPDATED",
          entityType: "Customer",
          entityId: id,
          metadata: { fields: changedFields },
        },
        transaction,
      );
      return this.toProfile(customer);
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.update(id, { isActive: false });
  }

  async listFiles(customerId: string): Promise<CustomerFileRecord[]> {
    const { businessId } = this.requestContext.requireTenant();
    await this.findCustomer(this.prisma, businessId, customerId);
    const files = await this.prisma.customerFile.findMany({
      where: { businessId, customerId },
      orderBy: { createdAt: "desc" },
    });
    return files.map((file) => this.toFileRecord(file));
  }

  async uploadFile(
    customerId: string,
    input: {
      kind: CustomerFileKind;
      originalName: string;
      contentType: string;
      sizeBytes: number;
      body: Buffer;
    },
  ): Promise<CustomerFileRecord> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    this.assertUploadableFile(input);
    await this.findCustomer(this.prisma, businessId, customerId);

    const fileId = randomUUID();
    const storageKey = customerFileStorageKey({
      businessId,
      customerId,
      fileId,
      contentType: input.contentType,
    });
    await this.objectStorage.putObject(
      storageKey,
      input.body,
      input.contentType,
    );

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const file = await transaction.customerFile.create({
          data: {
            id: fileId,
            businessId,
            customerId,
            kind: input.kind,
            originalName: this.sanitizeOriginalName(input.originalName),
            contentType: input.contentType,
            sizeBytes: input.sizeBytes,
            storageKey,
            uploadedByUserId: authorization?.user.userId,
          },
        });
        await this.auditLog.record(
          {
            businessId,
            userId: authorization?.user.userId,
            action: "CUSTOMER_FILE_UPLOADED",
            entityType: "CustomerFile",
            entityId: file.id,
            metadata: { customerId, kind: input.kind },
          },
          transaction,
        );
        return this.toFileRecord(file);
      });
    } catch (error) {
      await this.objectStorage.deleteObject(storageKey);
      throw error;
    }
  }

  async getFileContent(
    customerId: string,
    fileId: string,
  ): Promise<{
    originalName: string;
    contentType: string;
    body: Buffer;
  }> {
    const file = await this.findFile(customerId, fileId);
    try {
      const stored = await this.objectStorage.getObject(file.storageKey);
      return {
        originalName: file.originalName,
        contentType: file.contentType,
        body: stored.body,
      };
    } catch (error) {
      if (error instanceof StorageObjectNotFoundError) {
        throw new NotFoundException({
          message: "Resource not found.",
          code: "RESOURCE_NOT_FOUND",
        });
      }
      throw error;
    }
  }

  async deleteFile(customerId: string, fileId: string): Promise<void> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    const file = await this.findFile(customerId, fileId);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.customerFile.delete({ where: { id: file.id } });
      await this.auditLog.record(
        {
          businessId,
          userId: authorization?.user.userId,
          action: "CUSTOMER_FILE_DELETED",
          entityType: "CustomerFile",
          entityId: file.id,
          metadata: { customerId, kind: file.kind },
        },
        transaction,
      );
    });
    await this.objectStorage.deleteObject(file.storageKey);
  }

  private buildSearchWhere(
    businessId: string,
    query: ListCustomersQueryDto,
  ): Prisma.CustomerWhereInput {
    const search = query.q?.trim();
    const tokens = search?.split(/\s+/).filter(Boolean) ?? [];
    const or: Prisma.CustomerWhereInput[] = [];

    if (search) {
      or.push(
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      );
      if (tokens.length >= 2) {
        or.push({
          AND: [
            { firstName: { contains: tokens[0], mode: "insensitive" } },
            {
              lastName: {
                contains: tokens.slice(1).join(" "),
                mode: "insensitive",
              },
            },
          ],
        });
      }
    }

    return {
      businessId,
      isActive: query.isActive,
      ...(or.length > 0 ? { OR: or } : {}),
    };
  }

  private async findCustomer(
    database: Database,
    businessId: string,
    id: string,
  ) {
    const customer = await database.customer.findFirst({
      where: { id, businessId },
    });
    if (!customer) {
      throw new NotFoundException({
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    return customer;
  }

  private async findFile(customerId: string, fileId: string) {
    const { businessId } = this.requestContext.requireTenant();
    await this.findCustomer(this.prisma, businessId, customerId);
    const file = await this.prisma.customerFile.findFirst({
      where: { id: fileId, businessId, customerId },
    });
    if (!file) {
      throw new NotFoundException({
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
    return file;
  }

  private assertUploadableFile(input: {
    originalName: string;
    contentType: string;
    sizeBytes: number;
    body: Buffer;
  }): void {
    if (!input.body.length || input.sizeBytes <= 0) {
      throw new BadRequestException({
        message: "A non-empty file is required.",
        code: "FILE_REQUIRED",
      });
    }
    if (input.sizeBytes > CUSTOMER_FILE_MAX_BYTES) {
      throw new BadRequestException({
        message: "File exceeds the 10MB limit.",
        code: "FILE_TOO_LARGE",
      });
    }
    if (!isAllowedCustomerFileType(input.contentType)) {
      throw new BadRequestException({
        message: "Only PDF and image files are allowed.",
        code: "UNSUPPORTED_FILE_TYPE",
      });
    }
    // Bildirilen MIME türü yerine geçilemez: içerik imzası eşleşmeli.
    const detected = detectCustomerFileSignature(input.body);
    if (detected !== input.contentType) {
      throw new BadRequestException({
        message: "File content does not match the declared file type.",
        code: "UNSUPPORTED_FILE_TYPE",
      });
    }
  }

  private sanitizeOriginalName(name: string): string {
    const trimmed = name.replace(/[/\\]/g, "_").trim() || "file";
    return trimmed.slice(0, 255);
  }

  private toFileRecord(file: {
    id: string;
    customerId: string;
    kind: CustomerFileKind;
    originalName: string;
    contentType: string;
    sizeBytes: number;
    createdAt: Date;
  }): CustomerFileRecord {
    return {
      id: file.id,
      customerId: file.customerId,
      kind: file.kind,
      originalName: file.originalName,
      contentType: file.contentType,
      sizeBytes: file.sizeBytes,
      createdAt: file.createdAt.toISOString(),
    };
  }

  private toBirthDate(value: string | null | undefined): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return new Date(`${value}T00:00:00.000Z`);
  }

  private toProfile(customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    birthDate: Date | null;
    notes: string | null;
    smsConsent: boolean;
    whatsappConsent: boolean;
    emailConsent: boolean;
    ledgerBalance: { toFixed(digits: number): string };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CustomerProfile {
    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email,
      birthDate: customer.birthDate
        ? customer.birthDate.toISOString().slice(0, 10)
        : null,
      notes: customer.notes,
      smsConsent: customer.smsConsent,
      whatsappConsent: customer.whatsappConsent,
      emailConsent: customer.emailConsent,
      ledgerBalance: customer.ledgerBalance.toFixed(2),
      isActive: customer.isActive,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }

  private toPage<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number,
  ): PaginatedResponse<T> {
    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page * pageSize < total,
    };
  }
}
