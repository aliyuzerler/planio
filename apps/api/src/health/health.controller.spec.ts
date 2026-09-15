import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    controller = module.get(HealthController);
  });

  it("returns ok for liveness", () => {
    expect(controller.getHealth()).toEqual({ status: "ok" });
  });

  it("reports unreadiness when dependencies are missing", async () => {
    await expect(controller.getReady()).rejects.toMatchObject({
      response: {
        code: "NOT_READY",
        details: { process: true, database: false, redis: false },
      },
    });
  });
});
