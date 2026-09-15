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
  Put,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import type { SpecializationProfile, StaffHoursSettings, StaffProfile } from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import {
  AssignStaffSpecializationDto,
  CreateSpecializationDto,
  CreateStaffDto,
  ListSpecializationsQueryDto,
  ListStaffQueryDto,
  UpdateSpecializationDto,
  UpdateStaffDto,
  UpdateStaffHoursDto,
} from "./dto/staff.dto";
import { StaffService } from "./staff.service";

const readRoles = ["BUSINESS_OWNER", "BUSINESS_ADMIN", "STAFF"] as const;
const writeRoles = ["BUSINESS_OWNER", "BUSINESS_ADMIN"] as const;

@ApiTags("staff")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller("staff")
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @RequireBusinessRoles(...readRoles)
  list(@Query() query: ListStaffQueryDto): Promise<StaffProfile[]> {
    return this.staffService.list(query);
  }

  @Post()
  @RequireBusinessRoles(...writeRoles)
  @ApiOperation({ summary: "Create staff in the active tenant" })
  create(@Body() input: CreateStaffDto): Promise<StaffProfile> {
    return this.staffService.create(input);
  }

  @Get(":id")
  @RequireBusinessRoles(...readRoles)
  get(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<StaffProfile> {
    return this.staffService.get(id);
  }

  @Post(":id/invite")
  @HttpCode(HttpStatus.OK)
  @RequireBusinessRoles(...writeRoles)
  @ApiOperation({ summary: "Email a staff invite link" })
  invite(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<{ sent: true }> {
    return this.staffService.invite(id);
  }

  @Get(":id/hours")
  @RequireBusinessRoles(...readRoles)
  getHours(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<StaffHoursSettings> {
    return this.staffService.getHours(id);
  }

  @Put(":id/hours")
  @RequireBusinessRoles(...writeRoles)
  updateHours(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UpdateStaffHoursDto,
  ): Promise<StaffHoursSettings> {
    return this.staffService.updateHours(id, input);
  }

  @Patch(":id")
  @RequireBusinessRoles(...writeRoles)
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UpdateStaffDto,
  ): Promise<StaffProfile> {
    return this.staffService.update(id, input);
  }

  @Delete(":id")
  @RequireBusinessRoles(...writeRoles)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<void> {
    await this.staffService.deactivate(id);
  }

  @Post(":id/specializations")
  @RequireBusinessRoles(...writeRoles)
  assignSpecialization(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: AssignStaffSpecializationDto,
  ): Promise<StaffProfile> {
    return this.staffService.assignSpecialization(id, input);
  }

  @Delete(":id/specializations/:specializationId")
  @RequireBusinessRoles(...writeRoles)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unassignSpecialization(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param(
      "specializationId",
      new ParseUUIDPipe({ version: "4" }),
    )
    specializationId: string,
  ): Promise<void> {
    await this.staffService.unassignSpecialization(id, specializationId);
  }
}

@ApiTags("specializations")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller("specializations")
export class SpecializationsController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @RequireBusinessRoles(...readRoles)
  list(
    @Query() query: ListSpecializationsQueryDto,
  ): Promise<SpecializationProfile[]> {
    return this.staffService.listSpecializations(query);
  }

  @Post()
  @RequireBusinessRoles(...writeRoles)
  create(
    @Body() input: CreateSpecializationDto,
  ): Promise<SpecializationProfile> {
    return this.staffService.createSpecialization(input);
  }

  @Patch(":id")
  @RequireBusinessRoles(...writeRoles)
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UpdateSpecializationDto,
  ): Promise<SpecializationProfile> {
    return this.staffService.updateSpecialization(id, input);
  }

  @Delete(":id")
  @RequireBusinessRoles(...writeRoles)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<void> {
    await this.staffService.deactivateSpecialization(id);
  }
}
