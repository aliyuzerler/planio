import { Controller, Get, HttpCode, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type { DataExportRecord, DataRequestRecord } from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import { PrivacyService } from "./privacy.service";

@ApiTags("privacy")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller("privacy")
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get("export")
  @RequireBusinessRoles("BUSINESS_OWNER")
  exportData(): Promise<DataExportRecord> {
    return this.privacy.exportData();
  }

  @Post("erase")
  @HttpCode(202)
  @RequireBusinessRoles("BUSINESS_OWNER")
  requestErase(): Promise<DataRequestRecord> {
    return this.privacy.requestErase();
  }
}
