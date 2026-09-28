import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiEnv } from "@xenior/config";
import type { Prisma } from "@xenior/database";
import type {
  SpecializationProfile,
  StaffHoursSettings,
  StaffProfile,
  UpdateStaffInput,
} from "@xenior/types";
import { createAuthTokenValue, hashAuthToken } from "../auth/auth-token";
import { AuditLogService } from "../audit/audit-log.service";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { MailService } from "../notifications/mail.service";
import { renderInviteEmail } from "../notifications/email-templates";
import { SubscriptionAccessService } from "../subscriptions/subscription-access.service";
import {
  AssignStaffSpecializationDto,
  CreateSpecializationDto,
  CreateStaffDto,
  ListSpecializationsQueryDto,
  ListStaffQueryDto,
  UpdateSpecializationDto,
  UpdateStaffDto,
  UpdateStaffHoursDto,
} from "./dto/staff.dto";
import { defaultWeeklyHours } from "../business/hours";

const staffInclude = {
  specializations: {
    include: { specialization: true },
    orderBy: { specialization: { name: "asc" as const } },
  },
};

type Database = PrismaService | Prisma.TransactionClient;

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
    private readonly subscriptionAccess: SubscriptionAccessService,
    private readonly config: ConfigService<ApiEnv, true>,
    @Optional() private readonly mail?: MailService,
  ) {}

  async list(query: ListStaffQueryDto): Promise<StaffProfile[]> {
    const { businessId } = this.requestContext.requireTenant();
    const staff = await this.prisma.staff.findMany({
      where: {
        businessId,
        isActive: query.isActive,
        loginRole: query.loginRole,
        ...(query.q
          ? {
              OR: [
                { firstName: { contains: query.q, mode: "insensitive" } },
                { lastName: { contains: query.q, mode: "insensitive" } },
                { phone: { contains: query.q, mode: "insensitive" } },
                { email: { contains: query.q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: staffInclude,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return staff.map((item) => this.toStaffProfile(item));
  }

  async get(id: string): Promise<StaffProfile> {
    const { businessId } = this.requestContext.requireTenant();
    const staff = await this.findStaff(this.prisma, businessId, id);
    return this.toStaffProfile(staff);
  }

  async getHours(id: string): Promise<StaffHoursSettings> {
    const { businessId } = this.requestContext.requireTenant();
    await this.findStaff(this.prisma, businessId, id);
    const rows = await this.prisma.staffHours.findMany({
      where: { businessId, staffId: id },
    });
    const byDay = new Map(rows.map((row) => [row.weekday, row]));
    return {
      days: defaultWeeklyHours().map((slot) => {
        const row = byDay.get(slot.weekday);
        return row
          ? {
              weekday: row.weekday,
              startMinutes: row.startMinutes,
              endMinutes: row.endMinutes,
              isClosed: row.isClosed,
            }
          : slot;
      }),
    };
  }

  async updateHours(
    id: string,
    input: UpdateStaffHoursDto,
  ): Promise<StaffHoursSettings> {
    const weekdays = input.days.map((day) => day.weekday);
    if (new Set(weekdays).size !== 7) {
      throw new BadRequestException({
        message: "Hours must include each weekday exactly once.",
        code: "INVALID_STAFF_HOURS",
      });
    }
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    await this.findStaff(this.prisma, businessId, id);
    await this.prisma.$transaction(async (transaction) => {
      for (const day of input.days) {
        await transaction.staffHours.upsert({
          where: { staffId_weekday: { staffId: id, weekday: day.weekday } },
          create: {
            businessId,
            staffId: id,
            weekday: day.weekday,
            startMinutes: day.startMinutes,
            endMinutes: day.endMinutes,
            isClosed: day.isClosed,
          },
          update: {
            startMinutes: day.startMinutes,
            endMinutes: day.endMinutes,
            isClosed: day.isClosed,
          },
        });
      }
    });
    return this.getHours(id);
  }

  async create(input: CreateStaffDto): Promise<StaffProfile> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    const loginRole = input.loginRole;
    const specializationIds =
      loginRole === "ACCOUNTANT" ? [] : (input.specializationIds ?? []);

    if (loginRole === "ACCOUNTANT" && !input.email) {
      throw new BadRequestException({
        message: "Accountant invites require an email address.",
        code: "STAFF_EMAIL_REQUIRED",
      });
    }

    if (loginRole === "STAFF") {
      await this.subscriptionAccess.assertWithinLimit("staff", businessId);
    } else {
      await this.subscriptionAccess.assertCanUseBusiness(businessId);
    }

    return this.prisma.$transaction(async (transaction) => {
      if (specializationIds.length > 0) {
        const count = await transaction.specialization.count({
          where: {
            businessId,
            id: { in: specializationIds },
            isActive: true,
          },
        });
        if (count !== specializationIds.length) {
          throw this.resourceNotFound();
        }
      }

      const staff = await transaction.staff.create({
        data: {
          businessId,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          email: input.email,
          notes: input.notes,
          loginRole,
        },
      });
      if (specializationIds.length > 0) {
        await transaction.staffSpecialization.createMany({
          data: specializationIds.map((specializationId) => ({
            businessId,
            staffId: staff.id,
            specializationId,
          })),
        });
      }

      await this.recordAudit(
        transaction,
        "STAFF_CREATED",
        "Staff",
        staff.id,
        {
          fields: [
            "firstName",
            "lastName",
            "loginRole",
            ...(input.phone !== undefined ? ["phone"] : []),
            ...(input.email !== undefined ? ["email"] : []),
            ...(input.notes !== undefined ? ["notes"] : []),
            ...(specializationIds.length > 0 ? ["specializations"] : []),
          ],
        },
        authorization?.user.userId,
      );
      return this.toStaffProfile(
        await this.findStaff(transaction, businessId, staff.id),
      );
    });
  }

  async update(id: string, input: UpdateStaffDto): Promise<StaffProfile> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    const changedFields = Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key) as (keyof UpdateStaffInput)[];
    if (changedFields.length === 0) {
      throw new BadRequestException({
        message: "At least one staff field must be provided.",
        code: "EMPTY_UPDATE",
      });
    }

    return this.prisma.$transaction(async (transaction) => {
      const existing = await this.findStaff(transaction, businessId, id);
      await transaction.staff.update({
        where: { id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          email: input.email,
          notes: input.notes,
          isActive: input.isActive,
        },
      });
      if (
        input.isActive !== undefined &&
        existing.businessUserId &&
        input.isActive !== existing.isActive
      ) {
        await transaction.businessUser.update({
          where: { id: existing.businessUserId },
          data: { isActive: input.isActive },
        });
      }
      await this.recordAudit(
        transaction,
        "STAFF_UPDATED",
        "Staff",
        id,
        { fields: changedFields },
        authorization?.user.userId,
      );
      return this.toStaffProfile(
        await this.findStaff(transaction, businessId, id),
      );
    });
  }

  async invite(id: string): Promise<{ sent: true }> {
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    const staff = await this.findStaff(this.prisma, businessId, id);
    if (!staff.email) {
      throw new BadRequestException({
        message: "Staff email is required before sending an invite.",
        code: "STAFF_EMAIL_REQUIRED",
      });
    }
    const raw = createAuthTokenValue();
    const roleLabel =
      staff.loginRole === "ACCOUNTANT" ? "muhasebe" : "personel";
    await this.prisma.authToken.create({
      data: {
        purpose: "STAFF_INVITE",
        tokenHash: hashAuthToken(raw),
        email: staff.email,
        businessId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: { staffId: staff.id, role: staff.loginRole },
      },
    });
    const webUrl = this.config.get("WEB_URL", { infer: true });
    const link = `${webUrl}/invite?token=${encodeURIComponent(raw)}`;
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { name: true },
    });
    const rendered = renderInviteEmail({
      webUrl,
      inviteUrl: link,
      email: staff.email,
      businessName: business.name,
      roleLabel: roleLabel === "muhasebe" ? "Muhasebe" : "Personel",
    });
    await this.mail?.sendBestEffort({
      businessId,
      destination: staff.email,
      subject: rendered.subject,
      body: rendered.text,
      html: rendered.html,
    });
    return { sent: true };
  }

  async deactivate(id: string): Promise<void> {
    await this.update(id, { isActive: false });
  }

  async listSpecializations(
    query: ListSpecializationsQueryDto,
  ): Promise<SpecializationProfile[]> {
    const { businessId } = this.requestContext.requireTenant();
    const specializations = await this.prisma.specialization.findMany({
      where: { businessId, isActive: query.isActive },
      orderBy: { name: "asc" },
    });
    return specializations.map((item) => this.toSpecializationProfile(item));
  }

  async createSpecialization(
    input: CreateSpecializationDto,
  ): Promise<SpecializationProfile> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.subscriptionAccess.assertCanUseBusiness(businessId);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const specialization = await transaction.specialization.create({
          data: { businessId, name: input.name },
        });
        await this.recordAudit(
          transaction,
          "SPECIALIZATION_CREATED",
          "Specialization",
          specialization.id,
          { fields: ["name"] },
          authorization?.user.userId,
        );
        return this.toSpecializationProfile(specialization);
      });
    } catch (error) {
      if (this.isUniqueConflict(error)) {
        throw new ConflictException({
          message: "A specialization with this name already exists.",
          code: "SPECIALIZATION_NAME_EXISTS",
        });
      }
      throw error;
    }
  }

  async updateSpecialization(
    id: string,
    input: UpdateSpecializationDto,
  ): Promise<SpecializationProfile> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    return this.prisma.$transaction(async (transaction) => {
      await this.findSpecialization(transaction, businessId, id);
      const specialization = await transaction.specialization.update({
        where: { id },
        data: { isActive: input.isActive },
      });
      await this.recordAudit(
        transaction,
        "SPECIALIZATION_UPDATED",
        "Specialization",
        id,
        { fields: ["isActive"] },
        authorization?.user.userId,
      );
      return this.toSpecializationProfile(specialization);
    });
  }

  async deactivateSpecialization(id: string): Promise<void> {
    await this.updateSpecialization(id, { isActive: false });
  }

  async assignSpecialization(
    staffId: string,
    input: AssignStaffSpecializationDto,
  ): Promise<StaffProfile> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const staff = await this.findStaff(transaction, businessId, staffId);
        if (staff.loginRole === "ACCOUNTANT") {
          throw new BadRequestException({
            message: "Accountants cannot be assigned specializations.",
            code: "ACCOUNTANT_SPECIALIZATION_FORBIDDEN",
          });
        }
        const specialization = await this.findSpecialization(
          transaction,
          businessId,
          input.specializationId,
        );
        if (!specialization.isActive) {
          throw new ConflictException({
            message: "Inactive specializations cannot be assigned.",
            code: "SPECIALIZATION_INACTIVE",
          });
        }
        await transaction.staffSpecialization.create({
          data: {
            businessId,
            staffId,
            specializationId: input.specializationId,
          },
        });
        await this.recordAudit(
          transaction,
          "STAFF_SPECIALIZATION_ASSIGNED",
          "Staff",
          staffId,
          { specializationId: input.specializationId },
          authorization?.user.userId,
        );
        return this.toStaffProfile(
          await this.findStaff(transaction, businessId, staffId),
        );
      });
    } catch (error) {
      if (this.isUniqueConflict(error)) {
        throw new ConflictException({
          message: "Specialization is already assigned to this staff member.",
          code: "STAFF_SPECIALIZATION_ALREADY_ASSIGNED",
        });
      }
      throw error;
    }
  }

  async unassignSpecialization(
    staffId: string,
    specializationId: string,
  ): Promise<void> {
    const authorization = this.requestContext.get();
    const { businessId } = this.requestContext.requireTenant();
    await this.prisma.$transaction(async (transaction) => {
      await this.findStaff(transaction, businessId, staffId);
      await this.findSpecialization(
        transaction,
        businessId,
        specializationId,
      );
      const result = await transaction.staffSpecialization.deleteMany({
        where: { businessId, staffId, specializationId },
      });
      if (result.count === 0) throw this.resourceNotFound();
      await this.recordAudit(
        transaction,
        "STAFF_SPECIALIZATION_UNASSIGNED",
        "Staff",
        staffId,
        { specializationId },
        authorization?.user.userId,
      );
    });
  }

  private async findStaff(
    database: Database,
    businessId: string,
    id: string,
  ) {
    const staff = await database.staff.findFirst({
      where: { id, businessId },
      include: staffInclude,
    });
    if (!staff) throw this.resourceNotFound();
    return staff;
  }

  private async findSpecialization(
    database: Database,
    businessId: string,
    id: string,
  ) {
    const specialization = await database.specialization.findFirst({
      where: { id, businessId },
    });
    if (!specialization) throw this.resourceNotFound();
    return specialization;
  }

  private async recordAudit(
    database: Prisma.TransactionClient,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Prisma.InputJsonValue,
    userId?: string,
  ): Promise<void> {
    const { businessId } = this.requestContext.requireTenant();
    await this.auditLog.record(
      { businessId, userId, action, entityType, entityId, metadata },
      database,
    );
  }

  private resourceNotFound(): NotFoundException {
    return new NotFoundException({
      message: "Resource not found.",
      code: "RESOURCE_NOT_FOUND",
    });
  }

  private isUniqueConflict(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }

  private toStaffProfile(staff: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    loginRole: "STAFF" | "ACCOUNTANT";
    isActive: boolean;
    businessUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
    specializations: Array<{
      createdAt: Date;
      specialization: {
        id: string;
        name: string;
        isActive: boolean;
      };
    }>;
  }): StaffProfile {
    return {
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      phone: staff.phone,
      email: staff.email,
      notes: staff.notes,
      loginRole: staff.loginRole,
      isActive: staff.isActive,
      isSelf: Boolean(
        staff.businessUserId &&
          this.requestContext.get()?.tenant?.businessUserId ===
            staff.businessUserId,
      ),
      specializations: staff.specializations.map((assignment) => ({
        id: assignment.specialization.id,
        name: assignment.specialization.name,
        isActive: assignment.specialization.isActive,
        assignedAt: assignment.createdAt.toISOString(),
      })),
      createdAt: staff.createdAt.toISOString(),
      updatedAt: staff.updatedAt.toISOString(),
    };
  }

  private toSpecializationProfile(specialization: {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): SpecializationProfile {
    return {
      id: specialization.id,
      name: specialization.name,
      isActive: specialization.isActive,
      createdAt: specialization.createdAt.toISOString(),
      updatedAt: specialization.updatedAt.toISOString(),
    };
  }
}
