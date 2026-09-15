import { UnrecoverableError } from "bullmq";
import { InvalidNotificationError } from "./notification-errors";
import { NotificationDeliveryService } from "./notification-delivery.service";
import type { NotificationProvider } from "./providers/notification-provider";
import { NotificationProviderResolver } from "./providers/provider.resolver";

describe("notification delivery", () => {
  const notification = {
    id: "11111111-1111-4111-8111-111111111111",
    businessId: "22222222-2222-4222-8222-222222222222",
    appointmentId: null,
    type: "APPOINTMENT_CONFIRMED",
    channel: "SMS",
    status: "PENDING",
    destination: "+905551112233",
    subject: null,
    body: "ok",
    payload: null,
    attemptCount: 0,
  };

  function setup(provider: NotificationProvider) {
    const updates: unknown[] = [];
    const prisma = {
      notification: {
        findUnique: jest.fn().mockResolvedValue({ ...notification }),
        update: jest.fn(async ({ data }: { data: unknown }) => {
          updates.push(data);
          return { ...notification, ...(data as object) };
        }),
      },
      appointment: { findFirst: jest.fn() },
    };
    const resolver = {
      resolve: async () => provider,
    } as unknown as NotificationProviderResolver;
    const delivery = new NotificationDeliveryService(prisma as never, resolver);
    return { delivery, updates, prisma };
  }

  it("marks a successful send as SENT", async () => {
    const { delivery, updates } = setup({
      name: "mock-sms",
      channel: "SMS",
      send: async () => ({ provider: "mock-sms", providerMessageId: "1" }),
    });
    await delivery.process(notification.id);
    expect(updates.at(-1)).toMatchObject({ status: "SENT", provider: "mock-sms" });
  });

  it("does not retry invalid notifications", async () => {
    const { delivery, updates } = setup({
      name: "mock-sms",
      channel: "SMS",
      send: async () => {
        throw new InvalidNotificationError("missing", "MISSING_DESTINATION");
      },
    });
    await expect(delivery.process(notification.id)).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    expect(updates.at(-1)).toMatchObject({
      status: "FAILED",
      errorCode: "MISSING_DESTINATION",
    });
  });

  it("rethrows provider failures so the queue can retry", async () => {
    const { delivery, updates } = setup({
      name: "mock-sms",
      channel: "SMS",
      send: async () => {
        throw new Error("upstream timeout");
      },
    });
    await expect(delivery.process(notification.id)).rejects.toThrow(
      "upstream timeout",
    );
    expect(updates.at(-1)).toMatchObject({
      status: "FAILED",
      errorCode: "PROVIDER_FAILURE",
    });
  });
});
