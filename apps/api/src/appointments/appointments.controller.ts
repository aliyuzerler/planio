import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type { AppointmentRecord, PaginatedResponse } from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import {
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  RescheduleAppointmentDto,
  UpdateAppointmentDto,
} from "./dto/appointment.dto";
import { AppointmentsService } from "./appointments.service";

const businessRoles = ["BUSINESS_OWNER", "BUSINESS_ADMIN", "STAFF"] as const;

@ApiTags("appointments")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  @RequireBusinessRoles(...businessRoles)
  list(
    @Query() query: ListAppointmentsQueryDto,
  ): Promise<PaginatedResponse<AppointmentRecord>> {
    return this.appointments.list(query);
  }

  @Post()
  @RequireBusinessRoles(...businessRoles)
  create(@Body() input: CreateAppointmentDto): Promise<AppointmentRecord> {
    return this.appointments.create(input);
  }

  @Get(":id")
  @RequireBusinessRoles(...businessRoles)
  get(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<AppointmentRecord> {
    return this.appointments.get(id);
  }

  @Patch(":id")
  @RequireBusinessRoles(...businessRoles)
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UpdateAppointmentDto,
  ): Promise<AppointmentRecord> {
    return this.appointments.update(id, input);
  }

  @Post(":id/cancel")
  @RequireBusinessRoles(...businessRoles)
  cancel(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<AppointmentRecord> {
    return this.appointments.cancel(id);
  }

  @Post(":id/reschedule")
  @RequireBusinessRoles(...businessRoles)
  reschedule(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: RescheduleAppointmentDto,
  ): Promise<AppointmentRecord> {
    return this.appointments.reschedule(id, input);
  }

  @Post(":id/complete")
  @RequireBusinessRoles(...businessRoles)
  complete(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<AppointmentRecord> {
    return this.appointments.complete(id);
  }

  @Post(":id/no-show")
  @RequireBusinessRoles(...businessRoles)
  markNoShow(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<AppointmentRecord> {
    return this.appointments.markNoShow(id);
  }
}
