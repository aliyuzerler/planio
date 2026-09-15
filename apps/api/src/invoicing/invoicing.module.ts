import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { OfficialDocumentsController } from "./official-documents.controller";
import { OfficialDocumentsService } from "./official-documents.service";
import { TenantUyumsoftController } from "./tenant-uyumsoft.controller";
import { TenantUyumsoftService } from "./tenant-uyumsoft.service";
import { UyumsoftIssuer } from "./uyumsoft.issuer";

@Module({
  imports: [AuditModule, AuthorizationModule, SubscriptionsModule],
  controllers: [TenantUyumsoftController, OfficialDocumentsController],
  providers: [TenantUyumsoftService, OfficialDocumentsService, UyumsoftIssuer],
})
export class InvoicingModule {}
