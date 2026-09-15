import { SetMetadata } from "@nestjs/common";
import type { BusinessUserRole, PlatformRole } from "@xenior/types";
import {
  ALLOW_SUPER_ADMIN_BYPASS_KEY,
  BUSINESS_ROLES_KEY,
  PLATFORM_ROLES_KEY,
  SKIP_TENANT_KEY,
} from "./authorization.constants";

export const SkipTenant = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_TENANT_KEY, true);

export const AllowSuperAdminBypass = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_SUPER_ADMIN_BYPASS_KEY, true);

export const RequireBusinessRoles = (
  ...roles: BusinessUserRole[]
): MethodDecorator & ClassDecorator => SetMetadata(BUSINESS_ROLES_KEY, roles);

export const RequirePlatformRoles = (
  ...roles: PlatformRole[]
): MethodDecorator & ClassDecorator => SetMetadata(PLATFORM_ROLES_KEY, roles);
