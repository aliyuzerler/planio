import { Module } from "@nestjs/common";
import { AuthorizationModule } from "../authorization/authorization.module";
import { LedgerModule } from "../ledger/ledger.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
import { TenantPaymentsController } from "./tenant-payments.controller";
import { TenantPaymentsService } from "./tenant-payments.service";

@Module({
  imports: [AuthorizationModule, LedgerModule, SubscriptionsModule],
  controllers: [CheckoutController, TenantPaymentsController],
  providers: [CheckoutService, TenantPaymentsService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
