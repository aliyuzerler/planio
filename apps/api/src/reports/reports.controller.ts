import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type { FinanceSummaryReport } from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import { ListReportsQueryDto } from "./dto/reports.dto";
import { ReportsService } from "./reports.service";

const reportRoles = ["BUSINESS_OWNER", "ACCOUNTANT"] as const;

@ApiTags("reports")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("summary")
  @RequireBusinessRoles(...reportRoles)
  summary(@Query() query: ListReportsQueryDto): Promise<FinanceSummaryReport> {
    return this.reports.summary(query);
  }
}
