import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { ERASE_JOB, ERASE_QUEUE } from "./privacy.constants";
import type { EraseJobData } from "./privacy-queue.service";
import { PrivacyService } from "./privacy.service";

@Processor(ERASE_QUEUE)
export class PrivacyProcessor extends WorkerHost {
  private readonly logger = new Logger(PrivacyProcessor.name);

  constructor(private readonly privacy: PrivacyService) {
    super();
  }

  async process(job: Job<EraseJobData>): Promise<void> {
    if (job.name !== ERASE_JOB) {
      this.logger.warn(`Ignoring unknown erase job ${job.name}`);
      return;
    }
    await this.privacy.processErase(job.data.requestId);
  }
}
