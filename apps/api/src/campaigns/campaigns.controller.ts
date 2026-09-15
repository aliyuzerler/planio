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
import type { BroadcastSmsResult, CampaignRecord, PriceQuote } from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import { CampaignsService } from "./campaigns.service";
import {
  CreateCampaignDto,
  ListCampaignsQueryDto,
  PriceQuoteQueryDto,
  UpdateCampaignDto,
  BroadcastSmsDto,
} from "./dto/campaign.dto";

const readRoles = ["BUSINESS_OWNER", "BUSINESS_ADMIN", "STAFF"] as const;
const quoteRoles = [
  "BUSINESS_OWNER",
  "BUSINESS_ADMIN",
  "STAFF",
  "ACCOUNTANT",
] as const;
const writeRoles = ["BUSINESS_OWNER", "BUSINESS_ADMIN"] as const;

@ApiTags("campaigns")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  @RequireBusinessRoles(...readRoles)
  list(@Query() query: ListCampaignsQueryDto): Promise<CampaignRecord[]> {
    return this.campaigns.list(query);
  }

  @Get("quote")
  @RequireBusinessRoles(...quoteRoles)
  quote(@Query() query: PriceQuoteQueryDto): Promise<PriceQuote> {
    return this.campaigns.quote(query);
  }

  @Post()
  @RequireBusinessRoles(...writeRoles)
  create(@Body() input: CreateCampaignDto): Promise<CampaignRecord> {
    return this.campaigns.create(input);
  }

  @Get(":id")
  @RequireBusinessRoles(...readRoles)
  get(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<CampaignRecord> {
    return this.campaigns.get(id);
  }

  @Post(":id/broadcast-sms")
  @RequireBusinessRoles(...writeRoles)
  broadcastSms(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: BroadcastSmsDto = {},
  ): Promise<BroadcastSmsResult> {
    return this.campaigns.broadcastSms(id, input);
  }

  @Patch(":id")
  @RequireBusinessRoles(...writeRoles)
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UpdateCampaignDto,
  ): Promise<CampaignRecord> {
    return this.campaigns.update(id, input);
  }

  @Delete(":id")
  @RequireBusinessRoles(...writeRoles)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<void> {
    await this.campaigns.deactivate(id);
  }
}
