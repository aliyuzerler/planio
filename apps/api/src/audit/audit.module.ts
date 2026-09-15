import { Module } from "@nestjs/common";
import { AuthorizationModule } from "../authorization/authorization.module";
import { AuditLogService } from "./audit-log.service";
import { TenantAuditController } from "./tenant-audit.controller";

@Module({
  imports: [AuthorizationModule],
  controllers: [TenantAuditController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
