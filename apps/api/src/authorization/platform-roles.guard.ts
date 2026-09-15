import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { PlatformRole } from "@xenior/types";
import { PLATFORM_ROLES_KEY } from "./authorization.constants";
import type { AuthorizedRequest } from "./request-authorization-context.interface";

@Injectable()
export class PlatformRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      PlatformRole[] | undefined
    >(PLATFORM_ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles?.length) {
      return true;
    }

    const user = context.switchToHttp().getRequest<AuthorizedRequest>().user;
    if (!user || !requiredRoles.includes(user.platformRole)) {
      throw new ForbiddenException({
        message: "The current platform role cannot perform this operation.",
        code: "INSUFFICIENT_PLATFORM_ROLE",
      });
    }
    return true;
  }
}
