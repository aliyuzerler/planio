import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiEnv } from "@xenior/config";
import { AuditModule } from "../audit/audit.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { IyzicoHttpClient } from "./iyzico/iyzico.client";
import { IYZICO_SUBSCRIPTION_PORT } from "./iyzico/iyzico.port";
import { MockIyzicoClient } from "./iyzico/mock-iyzico.client";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Global()
@Module({
  imports: [AuditModule, AuthorizationModule, SubscriptionsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: IYZICO_SUBSCRIPTION_PORT,
      useFactory: (config: ConfigService<ApiEnv, true>) => {
        const apiKey = config.get("IYZICO_API_KEY", { infer: true });
        const secretKey = config.get("IYZICO_SECRET_KEY", { infer: true });
        return apiKey && secretKey
          ? new IyzicoHttpClient(config)
          : new MockIyzicoClient();
      },
      inject: [ConfigService],
    },
  ],
  exports: [PaymentsService, IYZICO_SUBSCRIPTION_PORT],
})
export class PaymentsModule {}
