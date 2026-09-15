import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { isUUID } from "class-validator";
import { TENANT_HEADER } from "@xenior/types";
import { IS_PUBLIC_KEY } from "../common/decorators/public.decorator";
import {
  ALLOW_SUPER_ADMIN_BYPASS_KEY,
  SKIP_TENANT_KEY,
} from "./authorization.constants";
import { MembershipResolverService } from "./membership-resolver.service";
import type { AuthorizedRequest } from "./request-authorization-context.interface";

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly memberships: MembershipResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthorizedRequest>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException();
    }

    if (
      this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, targets)
    ) {
      request.authorization = {
        user,
        tenant: null,
        superAdminBypass: false,
      };
      return true;
    }

    const businessId = request.header(TENANT_HEADER);
    if (!businessId) {
      throw new BadRequestException({
        message: `${TENANT_HEADER} header is required.`,
        code: "TENANT_HEADER_REQUIRED",
      });
    }
    if (!isUUID(businessId, "4")) {
      throw new BadRequestException({
        message: `${TENANT_HEADER} header must be a valid UUID.`,
        code: "TENANT_HEADER_INVALID",
      });
    }

    const allowSuperAdminBypass =
      this.reflector.getAllAndOverride<boolean>(
        ALLOW_SUPER_ADMIN_BYPASS_KEY,
        targets,
      ) ?? false;
    request.authorization = await this.memberships.resolve(
      user,
      businessId,
      allowSuperAdminBypass,
    );
    return true;
  }
}
