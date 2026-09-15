import { Global, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { APPOINTMENT_NOTIFICATION_PORT } from "../appointments/appointment-notification.port";
import { AuthorizationModule } from "../authorization/authorization.module";
import { QueueModule } from "../infrastructure/queue/queue.module";
import { NOTIFICATION_PROVIDERS, NOTIFICATION_QUEUE } from "./notification.constants";
import { NotificationDeliveryService } from "./notification-delivery.service";
import { NotificationDispatcherService } from "./notification-dispatcher.service";
import { NotificationProcessor } from "./notification.processor";
import { NotificationQueueService } from "./notification-queue.service";
import { MailService } from "./mail.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { defaultMockProviders } from "./providers/mock.providers";
import { NotificationProviderRegistry } from "./providers/provider.registry";
import { NotificationProviderResolver } from "./providers/provider.resolver";

@Global()
@Module({
  imports: [
    QueueModule,
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
    AuthorizationModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    MailService,
    NotificationDispatcherService,
    NotificationQueueService,
    NotificationDeliveryService,
    NotificationProcessor,
    NotificationProviderRegistry,
    NotificationProviderResolver,
    {
      provide: NOTIFICATION_PROVIDERS,
      useFactory: defaultMockProviders,
    },
    {
      provide: APPOINTMENT_NOTIFICATION_PORT,
      useExisting: NotificationDispatcherService,
    },
  ],
  exports: [
    APPOINTMENT_NOTIFICATION_PORT,
    MailService,
    NotificationDeliveryService,
    NotificationDispatcherService,
    NotificationProviderResolver,
  ],
})
export class NotificationsModule {}
