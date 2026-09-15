import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AuditModule } from "../audit/audit.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { QueueModule } from "../infrastructure/queue/queue.module";
import { ERASE_QUEUE } from "./privacy.constants";
import { PrivacyController } from "./privacy.controller";
import { PrivacyProcessor } from "./privacy.processor";
import { PrivacyQueueService } from "./privacy-queue.service";
import { PrivacyService } from "./privacy.service";

@Module({
  imports: [
    QueueModule,
    BullModule.registerQueue({ name: ERASE_QUEUE }),
    AuthorizationModule,
    AuditModule,
  ],
  controllers: [PrivacyController],
  providers: [PrivacyService, PrivacyQueueService, PrivacyProcessor],
  exports: [PrivacyService],
})
export class PrivacyModule {}
