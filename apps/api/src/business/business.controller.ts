import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Put } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import type { BusinessHoursSettings, BusinessProfile } from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import { BusinessService } from "./business.service";
import { InviteAccountantDto } from "./dto/invite-accountant.dto";
import { UpdateBusinessHoursDto } from "./dto/update-business-hours.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";

const profileReaders = [
  "BUSINESS_OWNER",
  "BUSINESS_ADMIN",
  "STAFF",
  "ACCOUNTANT",
] as const;
const operators = ["BUSINESS_OWNER", "BUSINESS_ADMIN"] as const;

@ApiTags("business")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller("business")
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  @RequireBusinessRoles(...profileReaders)
  @ApiOperation({ summary: "Get the active tenant business profile" })
  @ApiOkResponse({ description: "Business profile" })
  getProfile(): Promise<BusinessProfile> {
    return this.businessService.getProfile();
  }

  @Patch()
  @RequireBusinessRoles(...operators)
  @ApiOperation({ summary: "Update the active tenant business profile" })
  @ApiOkResponse({ description: "Updated business profile" })
  updateProfile(
    @Body() input: UpdateBusinessDto,
  ): Promise<BusinessProfile> {
    return this.businessService.updateProfile(input);
  }

  @Get("hours")
  @RequireBusinessRoles("BUSINESS_OWNER", "BUSINESS_ADMIN", "STAFF")
  getHours(): Promise<BusinessHoursSettings> {
    return this.businessService.getHours();
  }

  @Put("hours")
  @RequireBusinessRoles(...operators)
  updateHours(
    @Body() input: UpdateBusinessHoursDto,
  ): Promise<BusinessHoursSettings> {
    return this.businessService.updateHours(input);
  }

  @Post("accountant-invites")
  @HttpCode(HttpStatus.OK)
  @RequireBusinessRoles(...operators)
  @ApiOperation({ summary: "Invite an accountant login for this business" })
  inviteAccountant(@Body() input: InviteAccountantDto): Promise<{ sent: true }> {
    return this.businessService.inviteAccountant(input);
  }
}
