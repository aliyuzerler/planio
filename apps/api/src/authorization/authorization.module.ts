import { Module } from "@nestjs/common";
import { BusinessRolesGuard } from "./business-roles.guard";
import { MembershipResolverService } from "./membership-resolver.service";
import { PlatformRolesGuard } from "./platform-roles.guard";
import { RequestContextInterceptor } from "./request-context.interceptor";
import { RequestContextService } from "./request-context.service";
import { TenantContextGuard } from "./tenant-context.guard";
import { TenantResourceAccessService } from "./tenant-resource-access.service";

@Module({
  providers: [
    BusinessRolesGuard,
    MembershipResolverService,
    PlatformRolesGuard,
    RequestContextInterceptor,
    RequestContextService,
    TenantContextGuard,
    TenantResourceAccessService,
  ],
  exports: [
    BusinessRolesGuard,
    MembershipResolverService,
    PlatformRolesGuard,
    RequestContextInterceptor,
    RequestContextService,
    TenantContextGuard,
    TenantResourceAccessService,
  ],
})
export class AuthorizationModule {}
