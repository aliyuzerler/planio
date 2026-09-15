import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { StorageModule } from "../infrastructure/storage/storage.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";

@Module({
  imports: [
    AuditModule,
    AuthorizationModule,
    StorageModule,
    SubscriptionsModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
