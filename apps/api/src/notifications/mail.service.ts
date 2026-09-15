import { Injectable, Logger } from "@nestjs/common";
import { NotificationProviderResolver } from "./providers/provider.resolver";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly resolver: NotificationProviderResolver) {}

  async sendTransactional(input: {
    businessId?: string | null;
    destination: string;
    subject: string;
    body: string;
  }): Promise<void> {
    const provider = input.businessId
      ? await this.resolver.resolve(input.businessId, "EMAIL")
      : await this.resolver.resolvePlatform("EMAIL");
    try {
      await provider.send({
        notificationId: "00000000-0000-4000-8000-000000000001",
        businessId: input.businessId ?? "platform",
        channel: "EMAIL",
        destination: input.destination,
        subject: input.subject,
        body: input.body,
      });
    } catch (error) {
      this.logger.warn(
        `Transactional email failed: ${
          error instanceof Error ? error.message : "unknown"
        }`,
      );
      throw error;
    }
  }

  async sendBestEffort(input: {
    businessId?: string | null;
    destination: string;
    subject: string;
    body: string;
  }): Promise<void> {
    try {
      await this.sendTransactional(input);
    } catch {
      this.logger.warn(`Best-effort email skipped for ${input.subject}.`);
    }
  }
}
