import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { NOTIFICATION_JOB, NOTIFICATION_QUEUE } from "./notification.constants";
import { NotificationDeliveryService } from "./notification-delivery.service";
import type { NotificationJobData } from "./notification-queue.service";

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly delivery: NotificationDeliveryService) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    if (job.name !== NOTIFICATION_JOB) {
      this.logger.warn(`Ignoring unknown notification job ${job.name}`);
      return;
    }
    await this.delivery.process(job.data.notificationId);
  }
}
