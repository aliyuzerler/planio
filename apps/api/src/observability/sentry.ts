import { Logger } from "@nestjs/common";

const logger = new Logger("Sentry");

export function initSentry(env: { dsn?: string; environment: string }): void {
  if (!env.dsn) {
    return;
  }
  logger.log(`Sentry DSN configured for ${env.environment}.`);
}
