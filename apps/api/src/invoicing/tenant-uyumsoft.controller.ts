import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type { TenantUyumsoftSettingsRecord } from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import { UpsertTenantUyumsoftSettingsDto } from "./dto/invoicing.dto";
import { TenantUyumsoftService } from "./tenant-uyumsoft.service";

@ApiTags("integrations")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller("integrations/uyumsoft")
export class TenantUyumsoftController {
  constructor(private readonly uyumsoft: TenantUyumsoftService) {}

  @Get()
  @RequireBusinessRoles("BUSINESS_OWNER")
  get(): Promise<TenantUyumsoftSettingsRecord> {
    return this.uyumsoft.get();
  }

  @Patch()
  @RequireBusinessRoles("BUSINESS_OWNER")
  upsert(
    @Body() input: UpsertTenantUyumsoftSettingsDto,
  ): Promise<TenantUyumsoftSettingsRecord> {
    return this.uyumsoft.upsert(input);
  }
}
