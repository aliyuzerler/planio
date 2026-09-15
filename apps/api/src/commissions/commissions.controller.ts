import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type {
  CommissionEntryRecord,
  CommissionRuleRecord,
  PaginatedResponse,
} from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import { CommissionsService } from "./commissions.service";
import {
  CreateCommissionRuleDto,
  ListCommissionEntriesQueryDto,
  ListCommissionRulesQueryDto,
  UpdateCommissionRuleDto,
} from "./dto/commission.dto";

const ruleReadRoles = ["BUSINESS_OWNER", "BUSINESS_ADMIN"] as const;
const entryRoles = [
  "BUSINESS_OWNER",
  "BUSINESS_ADMIN",
  "STAFF",
  "ACCOUNTANT",
] as const;
const writeRoles = ["BUSINESS_OWNER", "BUSINESS_ADMIN"] as const;

@ApiTags("commissions")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller("commissions")
export class CommissionsController {
  constructor(private readonly commissions: CommissionsService) {}

  @Get("rules")
  @RequireBusinessRoles(...ruleReadRoles)
  listRules(
    @Query() query: ListCommissionRulesQueryDto,
  ): Promise<CommissionRuleRecord[]> {
    return this.commissions.listRules(query);
  }

  @Get("entries")
  @RequireBusinessRoles(...entryRoles)
  listEntries(
    @Query() query: ListCommissionEntriesQueryDto,
  ): Promise<PaginatedResponse<CommissionEntryRecord>> {
    return this.commissions.listEntries(query);
  }

  @Post("rules")
  @RequireBusinessRoles(...writeRoles)
  createRule(
    @Body() input: CreateCommissionRuleDto,
  ): Promise<CommissionRuleRecord> {
    return this.commissions.createRule(input);
  }

  @Get("rules/:id")
  @RequireBusinessRoles(...ruleReadRoles)
  getRule(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<CommissionRuleRecord> {
    return this.commissions.getRule(id);
  }

  @Patch("rules/:id")
  @RequireBusinessRoles(...writeRoles)
  updateRule(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UpdateCommissionRuleDto,
  ): Promise<CommissionRuleRecord> {
    return this.commissions.updateRule(id, input);
  }

  @Delete("rules/:id")
  @RequireBusinessRoles(...writeRoles)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateRule(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<void> {
    await this.commissions.deactivateRule(id);
  }
}
