import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { parseApiEnv, type ApiEnv } from "@xenior/config";
import { AuthModule } from "./auth/auth.module";
import { AuthorizationModule } from "./authorization/authorization.module";
import { BusinessRolesGuard } from "./authorization/business-roles.guard";
import { PlatformRolesGuard } from "./authorization/platform-roles.guard";
import { RequestContextInterceptor } from "./authorization/request-context.interceptor";
import { TenantContextGuard } from "./authorization/tenant-context.guard";
import { BusinessModule } from "./business/business.module";
import { StaffModule } from "./staff/staff.module";
import { ServicesModule } from "./services/services.module";
import { CustomersModule } from "./customers/customers.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { CommissionsModule } from "./commissions/commissions.module";
import { CheckoutModule } from "./checkout/checkout.module";
import { InvoicingModule } from "./invoicing/invoicing.module";
import { LedgerModule } from "./ledger/ledger.module";
import { ResourcesModule } from "./resources/resources.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { PaymentsModule } from "./payments/payments.module";
import { AdminModule } from "./admin/admin.module";
import { PrivacyModule } from "./privacy/privacy.module";
import { ReportsModule } from "./reports/reports.module";
import { AppThrottlerGuard } from "./common/guards/app-throttler.guard";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { RedisModule } from "./infrastructure/redis/redis.module";
import { QueueModule } from "./infrastructure/queue/queue.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => parseApiEnv(config),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<ApiEnv, true>) => ({
        throttlers: [
          {
            name: "default",
            ttl: 60_000,
            limit: config.get("NODE_ENV", { infer: true }) === "test" ? 10_000 : 120,
          },
        ],
      }),
    }),
    PrismaModule,
    RedisModule,
    QueueModule,
    AuthModule,
    AuthorizationModule,
    BusinessModule,
    StaffModule,
    ServicesModule,
    CustomersModule,
    AppointmentsModule,
    CampaignsModule,
    CommissionsModule,
    LedgerModule,
    CheckoutModule,
    InvoicingModule,
    ResourcesModule,
    NotificationsModule,
    SubscriptionsModule,
    PaymentsModule,
    AdminModule,
    PrivacyModule,
    ReportsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantContextGuard,
    },
    {
      provide: APP_GUARD,
      useClass: BusinessRolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PlatformRolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
  ],
})
export class AppModule {}
