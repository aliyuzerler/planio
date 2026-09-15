import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { SubscriptionAccessService } from "./subscription-access.service";
import { SubscriptionsController } from "./subscriptions.controller";
import { SubscriptionsService } from "./subscriptions.service";

@Module({
  imports: [AuditModule, AuthorizationModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionAccessService],
  exports: [SubscriptionsService, SubscriptionAccessService],
})
export class SubscriptionsModule {}
