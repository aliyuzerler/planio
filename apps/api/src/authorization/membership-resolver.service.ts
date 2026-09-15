import { ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import type {
  RequestAuthorizationContext,
  TenantMembershipContext,
} from "./request-authorization-context.interface";

@Injectable()
export class MembershipResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    user: AuthenticatedUser,
    businessId: string,
    allowSuperAdminBypass: boolean,
  ): Promise<RequestAuthorizationContext> {
    if (allowSuperAdminBypass && user.platformRole === "SUPER_ADMIN") {
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, status: true },
      });
      if (!business) {
        throw this.accessDenied();
      }
      return {
        user,
        tenant: {
          businessId: business.id,
          businessUserId: null,
          role: null,
          businessStatus: business.status,
        },
        superAdminBypass: true,
      };
    }

    const membership = await this.prisma.businessUser.findUnique({
      where: {
        businessId_userId: {
          businessId,
          userId: user.userId,
        },
      },
      include: {
        business: {
          select: { status: true },
        },
      },
    });

    if (!membership) {
      throw this.accessDenied();
    }
    if (!membership.isActive) {
      throw new ForbiddenException({
        message: "Business membership is inactive.",
        code: "TENANT_MEMBERSHIP_INACTIVE",
      });
    }
    if (membership.business.status !== "ACTIVE") {
      throw new ForbiddenException({
        message: "Business is not active.",
        code: "TENANT_BUSINESS_INACTIVE",
      });
    }

    const tenant: TenantMembershipContext = {
      businessId: membership.businessId,
      businessUserId: membership.id,
      role: membership.role,
      businessStatus: membership.business.status,
    };
    return {
      user,
      tenant,
      superAdminBypass: false,
    };
  }

  private accessDenied(): ForbiddenException {
    return new ForbiddenException({
      message: "Access to the requested business is denied.",
      code: "TENANT_ACCESS_DENIED",
    });
  }
}
