import { createHmac, timingSafeEqual } from "node:crypto";

export function signaturesMatch(expected: string, received: string): boolean {
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(received, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function subscriptionWebhookSignature(input: {
  merchantId: string;
  secretKey: string;
  eventType: string;
  subscriptionReferenceCode: string;
  orderReferenceCode: string;
  customerReferenceCode: string;
}): string {
  const message =
    input.merchantId +
    input.secretKey +
    input.eventType +
    input.subscriptionReferenceCode +
    input.orderReferenceCode +
    input.customerReferenceCode;
  return createHmac("sha256", input.secretKey).update(message).digest("hex");
}

export function hppWebhookSignature(input: {
  secretKey: string;
  eventType: string;
  iyziPaymentId: string;
  token: string;
  paymentConversationId: string;
  status: string;
}): string {
  const message =
    input.secretKey +
    input.eventType +
    input.iyziPaymentId +
    input.token +
    input.paymentConversationId +
    input.status;
  return createHmac("sha256", input.secretKey).update(message).digest("hex");
}

export function verifySubscriptionWebhookSignature(input: {
  merchantId: string;
  secretKey: string;
  eventType: string;
  subscriptionReferenceCode: string;
  orderReferenceCode: string;
  customerReferenceCode: string;
  headerSignature: string;
}): boolean {
  return signaturesMatch(
    subscriptionWebhookSignature(input),
    input.headerSignature,
  );
}

export function verifyHppWebhookSignature(input: {
  secretKey: string;
  eventType: string;
  iyziPaymentId: string;
  token: string;
  paymentConversationId: string;
  status: string;
  headerSignature: string;
}): boolean {
  return signaturesMatch(hppWebhookSignature(input), input.headerSignature);
}
