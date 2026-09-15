import { Controller, Get, HttpCode, HttpStatus, Post, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import type {
  PlanRecord,
  SubscriptionAccess,
  SubscriptionRecord,
} from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import { SubscriptionAccessService } from "./subscription-access.service";
import { SubscriptionsService } from "./subscriptions.service";

const readers = ["BUSINESS_OWNER", "BUSINESS_ADMIN", "STAFF", "ACCOUNTANT"] as const;
const writers = ["BUSINESS_OWNER", "BUSINESS_ADMIN"] as const;

@ApiTags("subscriptions")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller()
export class SubscriptionsController {
  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly access: SubscriptionAccessService,
  ) {}

  @Get("plans")
  @RequireBusinessRoles(...readers)
  @ApiOperation({ summary: "List active subscription plans" })
  listPlans(): Promise<PlanRecord[]> {
    return this.subscriptions.listPlans();
  }

  @Get("subscriptions/current")
  @RequireBusinessRoles(...readers)
  @ApiOperation({ summary: "Get the latest subscription for the tenant" })
  async getCurrent(@Res() response: Response): Promise<void> {
    const current = await this.subscriptions.getCurrent();
    response.status(HttpStatus.OK).json(current);
  }

  @Get("subscriptions/access")
  @RequireBusinessRoles(...readers)
  @ApiOperation({ summary: "Get feature access and plan limits" })
  getAccess(): Promise<SubscriptionAccess> {
    return this.access.getAccess();
  }

  @Post("subscriptions/cancel")
  @RequireBusinessRoles(...writers)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancel the current subscription at period end" })
  cancel(): Promise<SubscriptionRecord> {
    return this.subscriptions.cancel();
  }
}
