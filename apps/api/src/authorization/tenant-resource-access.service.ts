import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { RequestContextService } from "./request-context.service";

export type TenantResourceType =
  | "customer"
  | "staff"
  | "service"
  | "appointment"
  | "subscription"
  | "notification"
  | "auditLog";

@Injectable()
export class TenantResourceAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  async assertOwned(type: TenantResourceType, id: string): Promise<void> {
    const { businessId } = this.requestContext.requireTenant();
    const where = { id, businessId };
    const exists = await this.exists(type, where);

    if (!exists) {
      throw new NotFoundException({
        message: "The requested resource was not found.",
        code: "RESOURCE_NOT_FOUND",
      });
    }
  }

  private async exists(
    type: TenantResourceType,
    where: { id: string; businessId: string },
  ): Promise<boolean> {
    switch (type) {
      case "customer":
        return Boolean(
          await this.prisma.customer.findFirst({
            where,
            select: { id: true },
          }),
        );
      case "staff":
        return Boolean(
          await this.prisma.staff.findFirst({
            where,
            select: { id: true },
          }),
        );
      case "service":
        return Boolean(
          await this.prisma.service.findFirst({
            where,
            select: { id: true },
          }),
        );
      case "appointment":
        return Boolean(
          await this.prisma.appointment.findFirst({
            where,
            select: { id: true },
          }),
        );
      case "subscription":
        return Boolean(
          await this.prisma.subscription.findFirst({
            where,
            select: { id: true },
          }),
        );
      case "notification":
        return Boolean(
          await this.prisma.notification.findFirst({
            where,
            select: { id: true },
          }),
        );
      case "auditLog":
        return Boolean(
          await this.prisma.auditLog.findFirst({
            where,
            select: { id: true },
          }),
        );
    }
  }
}
