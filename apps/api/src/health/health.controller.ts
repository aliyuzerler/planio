import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "../common/decorators/public.decorator";
import { HealthService, type HealthCheckResult } from "./health.service";

@ApiTags("health")
@Public()
@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "API liveness check" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
      },
    },
  })
  getHealth(): { status: string } {
    return this.healthService.getLiveness();
  }

  @Get("ready")
  @ApiOperation({ summary: "API readiness check for database and Redis" })
  async getReady(): Promise<HealthCheckResult> {
    const result = await this.healthService.getReadiness();
    if (result.status !== "ok") {
      throw new ServiceUnavailableException({
        message: "One or more dependencies are unavailable.",
        code: "NOT_READY",
        details: result.checks,
      });
    }
    return result;
  }
}
