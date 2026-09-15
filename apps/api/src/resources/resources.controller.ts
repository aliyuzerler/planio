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
import type { ResourceProfile } from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import {
  CreateResourceDto,
  ListResourcesQueryDto,
  UpdateResourceDto,
} from "./dto/resource.dto";
import { ResourcesService } from "./resources.service";

const readRoles = ["BUSINESS_OWNER", "BUSINESS_ADMIN", "STAFF"] as const;
const writeRoles = ["BUSINESS_OWNER", "BUSINESS_ADMIN"] as const;

@ApiTags("resources")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller("resources")
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Get()
  @RequireBusinessRoles(...readRoles)
  list(@Query() query: ListResourcesQueryDto): Promise<ResourceProfile[]> {
    return this.resources.list(query);
  }

  @Post()
  @RequireBusinessRoles(...writeRoles)
  create(@Body() input: CreateResourceDto): Promise<ResourceProfile> {
    return this.resources.create(input);
  }

  @Get(":id")
  @RequireBusinessRoles(...readRoles)
  get(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<ResourceProfile> {
    return this.resources.get(id);
  }

  @Patch(":id")
  @RequireBusinessRoles(...writeRoles)
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UpdateResourceDto,
  ): Promise<ResourceProfile> {
    return this.resources.update(id, input);
  }

  @Delete(":id")
  @RequireBusinessRoles(...writeRoles)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<void> {
    await this.resources.deactivate(id);
  }
}
