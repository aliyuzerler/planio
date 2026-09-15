import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import {
  SpecializationsController,
  StaffController,
} from "./staff.controller";
import { StaffService } from "./staff.service";

@Module({
  imports: [AuditModule, AuthorizationModule, SubscriptionsModule],
  controllers: [StaffController, SpecializationsController],
  providers: [StaffService],
})
export class StaffModule {}
