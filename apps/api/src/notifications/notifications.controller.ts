import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type {
  NotificationChannelSetup,
  NotificationRecord,
  NotificationSettings,
  PaginatedResponse,
  PushDeviceRecord,
} from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import {
  ListNotificationsQueryDto,
  RegisterPushDeviceDto,
  TestNotificationChannelDto,
  UpdateNotificationSettingsDto,
  UpsertNotificationChannelDto,
} from "./dto/notification.dto";
import { NotificationsService } from "./notifications.service";

const readers = ["BUSINESS_OWNER", "BUSINESS_ADMIN", "STAFF"] as const;
const writers = ["BUSINESS_OWNER", "BUSINESS_ADMIN"] as const;

@ApiTags("notifications")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("settings")
  @RequireBusinessRoles(...readers)
  getSettings(): Promise<NotificationSettings> {
    return this.notifications.getSettings();
  }

  @Patch("settings")
  @RequireBusinessRoles(...writers)
  updateSettings(
    @Body() input: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> {
    return this.notifications.updateSettings(input);
  }

  @Post("devices")
  @HttpCode(201)
  @RequireBusinessRoles(...readers)
  registerDevice(
    @Body() input: RegisterPushDeviceDto,
  ): Promise<PushDeviceRecord> {
    return this.notifications.registerDevice(input);
  }

  @Get("setup")
  @RequireBusinessRoles(...writers)
  listSetup(): Promise<NotificationChannelSetup[]> {
    return this.notifications.listChannelSetup();
  }

  @Patch("setup")
  @RequireBusinessRoles(...writers)
  upsertSetup(
    @Body() input: UpsertNotificationChannelDto,
  ): Promise<NotificationChannelSetup[]> {
    return this.notifications.upsertChannel(input);
  }

  @Post("setup/test")
  @HttpCode(200)
  @RequireBusinessRoles(...writers)
  testSetup(
    @Body() input: TestNotificationChannelDto,
  ): Promise<NotificationChannelSetup[]> {
    return this.notifications.testChannel(input);
  }

  @Get()
  @RequireBusinessRoles(...writers)
  list(
    @Query() query: ListNotificationsQueryDto,
  ): Promise<PaginatedResponse<NotificationRecord>> {
    return this.notifications.list(query);
  }

  @Get(":id")
  @RequireBusinessRoles(...writers)
  get(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<NotificationRecord> {
    return this.notifications.get(id);
  }
}
