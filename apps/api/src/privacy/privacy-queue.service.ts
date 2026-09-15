import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import type { Queue } from "bullmq";
import {
  ERASE_BACKOFF_MS,
  ERASE_JOB,
  ERASE_MAX_ATTEMPTS,
  ERASE_QUEUE,
} from "./privacy.constants";

export interface EraseJobData {
  requestId: string;
  businessId: string;
}

@Injectable()
export class PrivacyQueueService {
  private readonly logger = new Logger(PrivacyQueueService.name);

  constructor(
    @InjectQueue(ERASE_QUEUE)
    private readonly queue: Queue<EraseJobData>,
  ) {}

  async enqueue(requestId: string, businessId: string): Promise<void> {
    await this.queue.add(
      ERASE_JOB,
      { requestId, businessId },
      {
        jobId: requestId,
        attempts: ERASE_MAX_ATTEMPTS,
        backoff: { type: "exponential", delay: ERASE_BACKOFF_MS },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      },
    );
  }

  async enqueueSafely(requestId: string, businessId: string): Promise<void> {
    try {
      await this.enqueue(requestId, businessId);
    } catch (error) {
      this.logger.warn(
        `Erase queue unavailable for ${requestId}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }
}
