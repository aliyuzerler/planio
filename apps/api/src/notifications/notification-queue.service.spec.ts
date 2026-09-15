import { NotificationQueueService } from "./notification-queue.service";
import {
  NOTIFICATION_JOB,
  NOTIFICATION_MAX_ATTEMPTS,
  NOTIFICATION_QUEUE,
} from "./notification.constants";

describe("notification queue", () => {
  it("creates a delayed deliver job with bounded retries", async () => {
    const add = jest.fn();
    const service = new NotificationQueueService({
      add,
      getJob: jest.fn(),
    } as never);
    await service.enqueue(
      "n1",
      "b1",
      new Date(Date.now() + 60_000),
    );
    expect(add).toHaveBeenCalledWith(
      NOTIFICATION_JOB,
      { notificationId: "n1", businessId: "b1" },
      expect.objectContaining({
        jobId: "n1",
        attempts: NOTIFICATION_MAX_ATTEMPTS,
        backoff: expect.objectContaining({ type: "exponential" }),
      }),
    );
    const options = add.mock.calls[0]?.[2] as { delay: number };
    expect(options.delay).toBeGreaterThan(0);
    expect(NOTIFICATION_QUEUE).toBe("notifications");
  });
});
