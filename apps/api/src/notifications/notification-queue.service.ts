import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import type { Queue } from "bullmq";
import {
  NOTIFICATION_BACKOFF_MS,
  NOTIFICATION_JOB,
  NOTIFICATION_MAX_ATTEMPTS,
  NOTIFICATION_QUEUE,
} from "./notification.constants";
import { queueDelayMs } from "./notification-schedule";

export interface NotificationJobData {
  notificationId: string;
  businessId: string;
}

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly queue: Queue<NotificationJobData>,
  ) {}

  async enqueue(
    notificationId: string,
    businessId: string,
    scheduledAt?: Date | null,
  ): Promise<void> {
    await this.queue.add(
      NOTIFICATION_JOB,
      { notificationId, businessId },
      {
        jobId: notificationId,
        delay: queueDelayMs(scheduledAt ?? null),
        attempts: NOTIFICATION_MAX_ATTEMPTS,
        backoff: { type: "exponential", delay: NOTIFICATION_BACKOFF_MS },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      },
    );
  }

  async remove(notificationId: string): Promise<void> {
    const job = await this.queue.getJob(notificationId);
    if (job) {
      await job.remove();
      return;
    }
    this.logger.debug(`No queued job for notification ${notificationId}`);
  }
}
