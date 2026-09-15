import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type { PaginatedResponse, TenantAuditLogItem } from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import { RequestContextService } from "../authorization/request-context.service";
import { ListTenantAuditLogsQueryDto } from "../reports/dto/reports.dto";
import { AuditLogService } from "./audit-log.service";

@ApiTags("audit-logs")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller("audit-logs")
export class TenantAuditController {
  constructor(
    private readonly auditLog: AuditLogService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get()
  @RequireBusinessRoles("BUSINESS_OWNER")
  list(
    @Query() query: ListTenantAuditLogsQueryDto,
  ): Promise<PaginatedResponse<TenantAuditLogItem>> {
    const { businessId } = this.requestContext.requireTenant();
    return this.auditLog.listForTenant(businessId, query);
  }
}
