import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { BusinessUserRole } from "@xenior/types";
import { BUSINESS_ROLES_KEY } from "./authorization.constants";
import type { AuthorizedRequest } from "./request-authorization-context.interface";

@Injectable()
export class BusinessRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      BusinessUserRole[] | undefined
    >(BUSINESS_ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles?.length) {
      return true;
    }

    const authorization = context
      .switchToHttp()
      .getRequest<AuthorizedRequest>().authorization;
    if (authorization?.superAdminBypass) {
      return true;
    }
    if (
      !authorization?.tenant?.role ||
      !requiredRoles.includes(authorization.tenant.role)
    ) {
      throw new ForbiddenException({
        message: "The current business role cannot perform this operation.",
        code: "INSUFFICIENT_BUSINESS_ROLE",
      });
    }
    return true;
  }
}
