import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type {
  AdminAuditLogItem,
  AdminBusinessDetail,
  AdminBusinessListItem,
  AdminDashboardMetrics,
  AdminSubscriptionSummary,
  PaginatedResponse,
  PlanRecord,
} from "@xenior/types";
import {
  RequirePlatformRoles,
  SkipTenant,
} from "../authorization/authorization.decorators";
import { AdminService } from "./admin.service";
import {
  ListAdminAuditLogsQueryDto,
  ListAdminBusinessesQueryDto,
  ListAdminSubscriptionsQueryDto,
  CreateAdminPlanDto,
  UpdateAdminBusinessStatusDto,
  UpdateAdminPlanDto,
} from "./dto/admin.dto";

@ApiTags("admin")
@ApiBearerAuth()
@SkipTenant()
@RequirePlatformRoles("SUPER_ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Platform metrics from live database counts" })
  @ApiOkResponse({ description: "Platform dashboard metrics" })
  dashboard(): Promise<AdminDashboardMetrics> {
    return this.admin.dashboard();
  }

  @Get("businesses")
  @ApiOperation({ summary: "List businesses across the platform" })
  listBusinesses(
    @Query() query: ListAdminBusinessesQueryDto,
  ): Promise<PaginatedResponse<AdminBusinessListItem>> {
    return this.admin.listBusinesses(query);
  }

  @Get("businesses/:id")
  @ApiOperation({ summary: "Get business details, users, and subscription" })
  getBusiness(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<AdminBusinessDetail> {
    return this.admin.getBusiness(id);
  }

  @Patch("businesses/:id/status")
  @ApiOperation({ summary: "Update a business status" })
  updateBusinessStatus(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UpdateAdminBusinessStatusDto,
  ): Promise<AdminBusinessDetail> {
    return this.admin.updateBusinessStatus(id, input);
  }

  @Get("plans")
  @ApiOperation({ summary: "List billing plans and iyzico mapping" })
  listPlans(): Promise<PlanRecord[]> {
    return this.admin.listPlans();
  }

  @Post("plans")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a billing plan stored in the database" })
  createPlan(@Body() input: CreateAdminPlanDto): Promise<PlanRecord> {
    return this.admin.createPlan(input);
  }

  @Patch("plans/:id")
  @ApiOperation({ summary: "Update plan price, period, limits, and iyzico code" })
  updatePlan(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UpdateAdminPlanDto,
  ): Promise<PlanRecord> {
    return this.admin.updatePlan(id, input);
  }

  @Get("subscriptions")
  @ApiOperation({ summary: "List subscriptions across the platform" })
  listSubscriptions(
    @Query() query: ListAdminSubscriptionsQueryDto,
  ): Promise<PaginatedResponse<AdminSubscriptionSummary>> {
    return this.admin.listSubscriptions(query);
  }

  @Get("audit-logs")
  @ApiOperation({ summary: "Search platform audit logs" })
  listAuditLogs(
    @Query() query: ListAdminAuditLogsQueryDto,
  ): Promise<PaginatedResponse<AdminAuditLogItem>> {
    return this.admin.listAuditLogs(query);
  }
}
