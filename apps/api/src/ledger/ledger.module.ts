import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { CashAccountsService } from "./cash-accounts.service";
import { ExpensesService } from "./expenses.service";
import { LedgerController } from "./ledger.controller";
import { LedgerService } from "./ledger.service";
import { SalesService } from "./sales.service";

@Module({
  imports: [
    AuditModule,
    AuthorizationModule,
    CampaignsModule,
    SubscriptionsModule,
  ],
  controllers: [LedgerController],
  providers: [CashAccountsService, SalesService, ExpensesService, LedgerService],
  exports: [SalesService],
})
export class LedgerModule {}
