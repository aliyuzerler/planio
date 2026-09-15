import {
  hppWebhookSignature,
  subscriptionWebhookSignature,
  verifyHppWebhookSignature,
  verifySubscriptionWebhookSignature,
} from "./iyzico-webhook";

describe("iyzico webhook signatures", () => {
  const secretKey = "test-iyzico-secret-key-not-for-production";
  const merchantId = "123456";

  it("accepts a valid subscription.order signature and rejects a tampered one", () => {
    const fields = {
      merchantId,
      secretKey,
      eventType: "subscription.order.success",
      subscriptionReferenceCode: "sub-1",
      orderReferenceCode: "ord-1",
      customerReferenceCode: "cus-1",
    };
    const signature = subscriptionWebhookSignature(fields);
    expect(verifySubscriptionWebhookSignature({ ...fields, headerSignature: signature })).toBe(
      true,
    );
    expect(
      verifySubscriptionWebhookSignature({
        ...fields,
        headerSignature: "00".repeat(32),
      }),
    ).toBe(false);
  });

  it("validates hosted checkout form signatures", () => {
    const fields = {
      secretKey,
      eventType: "CHECKOUT_FORM_AUTH",
      iyziPaymentId: "99",
      token: "tok-1",
      paymentConversationId: "pay-1",
      status: "SUCCESS",
    };
    const signature = hppWebhookSignature(fields);
    expect(verifyHppWebhookSignature({ ...fields, headerSignature: signature })).toBe(true);
  });
});
