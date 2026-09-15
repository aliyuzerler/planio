import {
  InvalidNotificationError,
  NotificationProviderError,
} from "../notification-errors";
import { MockNotificationProvider } from "./mock.providers";

describe("mock notification providers", () => {
  const sms = new MockNotificationProvider("SMS");

  it("sends a successful mock SMS", async () => {
    await expect(
      sms.send({
        notificationId: "n1",
        businessId: "b1",
        channel: "SMS",
        destination: "+905551112233",
        subject: null,
        body: "hello",
      }),
    ).resolves.toMatchObject({
      provider: "mock-sms",
      providerMessageId: "mock-sms-n1",
    });
  });

  it("rejects an invalid notification without a destination", async () => {
    await expect(
      sms.send({
        notificationId: "n1",
        businessId: "b1",
        channel: "SMS",
        destination: null,
        subject: null,
        body: "hello",
      }),
    ).rejects.toBeInstanceOf(InvalidNotificationError);
  });

  it("fails for a provider-failure destination", async () => {
    await expect(
      sms.send({
        notificationId: "n1",
        businessId: "b1",
        channel: "SMS",
        destination: "+900000000000",
        subject: null,
        body: "hello",
      }),
    ).rejects.toBeInstanceOf(NotificationProviderError);
  });
});
