import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { BusinessController } from "./business.controller";
import { BusinessService } from "./business.service";

@Module({
  imports: [AuditModule, AuthorizationModule, SubscriptionsModule],
  controllers: [BusinessController],
  providers: [BusinessService],
})
export class BusinessModule {}
