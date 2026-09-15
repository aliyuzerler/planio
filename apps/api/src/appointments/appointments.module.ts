import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { CommissionsModule } from "../commissions/commissions.module";
import { LedgerModule } from "../ledger/ledger.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentsService } from "./appointments.service";

@Module({
  imports: [
    AuditModule,
    AuthorizationModule,
    CampaignsModule,
    CommissionsModule,
    LedgerModule,
    SubscriptionsModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
