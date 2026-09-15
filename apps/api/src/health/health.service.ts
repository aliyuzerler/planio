import { Inject, Injectable, Optional } from "@nestjs/common";
import type Redis from "ioredis";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { REDIS_CLIENT } from "../infrastructure/redis/redis.module";

export interface HealthCheckResult {
  status: "ok" | "unavailable";
  checks: {
    process: boolean;
    database: boolean;
    redis: boolean;
  };
}

@Injectable()
export class HealthService {
  constructor(
    @Optional() private readonly prisma?: PrismaService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: Redis,
  ) {}

  getLiveness(): { status: "ok" } {
    return { status: "ok" };
  }

  async getReadiness(): Promise<HealthCheckResult> {
    const [database, redis] = await Promise.all([
      this.pingDatabase(),
      this.pingRedis(),
    ]);
    const ready = database && redis;
    return {
      status: ready ? "ok" : "unavailable",
      checks: {
        process: true,
        database,
        redis,
      },
    };
  }

  private async pingDatabase(): Promise<boolean> {
    if (!this.prisma) return false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async pingRedis(): Promise<boolean> {
    if (!this.redis) return false;
    try {
      return (await this.redis.ping()) === "PONG";
    } catch {
      return false;
    }
  }
}
