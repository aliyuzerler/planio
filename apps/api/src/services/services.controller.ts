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
import type { ServiceProfile } from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import {
  CreateServiceDto,
  ListServicesQueryDto,
  UpdateServiceDto,
} from "./dto/service.dto";
import { ServicesService } from "./services.service";

const readRoles = ["BUSINESS_OWNER", "BUSINESS_ADMIN", "STAFF"] as const;
const writeRoles = ["BUSINESS_OWNER", "BUSINESS_ADMIN"] as const;

@ApiTags("services")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller("services")
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  @RequireBusinessRoles(...readRoles)
  list(@Query() query: ListServicesQueryDto): Promise<ServiceProfile[]> {
    return this.services.list(query);
  }

  @Post()
  @RequireBusinessRoles(...writeRoles)
  create(@Body() input: CreateServiceDto): Promise<ServiceProfile> {
    return this.services.create(input);
  }

  @Get(":id")
  @RequireBusinessRoles(...readRoles)
  get(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<ServiceProfile> {
    return this.services.get(id);
  }

  @Patch(":id")
  @RequireBusinessRoles(...writeRoles)
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UpdateServiceDto,
  ): Promise<ServiceProfile> {
    return this.services.update(id, input);
  }

  @Delete(":id")
  @RequireBusinessRoles(...writeRoles)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<void> {
    await this.services.deactivate(id);
  }
}
