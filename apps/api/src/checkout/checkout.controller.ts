import { Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type { PaymentLinkRecord, PublicCheckoutRecord } from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import { Public } from "../common/decorators/public.decorator";
import { CheckoutService } from "./checkout.service";

const appointmentRoles = ["BUSINESS_OWNER", "BUSINESS_ADMIN", "STAFF"] as const;

@ApiTags("checkout")
@Controller("checkout")
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post("appointments/:id/link")
  @ApiBearerAuth()
  @ApiSecurity("business")
  @RequireBusinessRoles(...appointmentRoles)
  createLink(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<PaymentLinkRecord> {
    return this.checkout.createLink(id);
  }

  @Public()
  @Get(":token")
  get(@Param("token") token: string): Promise<PublicCheckoutRecord> {
    return this.checkout.getPublic(token);
  }

  @Public()
  @Post(":token/complete")
  complete(@Param("token") token: string): Promise<PublicCheckoutRecord> {
    return this.checkout.completePublic(token);
  }
}
