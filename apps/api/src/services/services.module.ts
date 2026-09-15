import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { ServicesController } from "./services.controller";
import { ServicesService } from "./services.service";

@Module({
  imports: [AuditModule, AuthorizationModule, SubscriptionsModule],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
