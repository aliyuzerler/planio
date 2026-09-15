import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type { TenantPaymentSettingsRecord } from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import { UpsertTenantPaymentSettingsDto } from "./dto/checkout.dto";
import { TenantPaymentsService } from "./tenant-payments.service";

@ApiTags("integrations")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller("integrations/payments")
export class TenantPaymentsController {
  constructor(private readonly payments: TenantPaymentsService) {}

  @Get()
  @RequireBusinessRoles("BUSINESS_OWNER")
  get(): Promise<TenantPaymentSettingsRecord> {
    return this.payments.get();
  }

  @Patch()
  @RequireBusinessRoles("BUSINESS_OWNER")
  upsert(
    @Body() input: UpsertTenantPaymentSettingsDto,
  ): Promise<TenantPaymentSettingsRecord> {
    return this.payments.upsert(input);
  }
}
