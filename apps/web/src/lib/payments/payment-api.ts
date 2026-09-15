import type {
  CreatePaymentCheckoutInput,
  PaymentCheckoutSession,
  PaymentRecord,
} from "@xenior/types";
import {
  createPaymentCheckoutInputSchema,
  paymentCheckoutSessionSchema,
  paymentRecordSchema,
} from "@xenior/validation";
import { apiRequest } from "@/lib/api/client";

export async function createPaymentCheckout(
  input: CreatePaymentCheckoutInput,
): Promise<PaymentCheckoutSession> {
  return paymentCheckoutSessionSchema.parse(
    await apiRequest<unknown>("/payments/checkout", {
      method: "POST",
      body: createPaymentCheckoutInputSchema.parse(input),
    }),
  );
}

export async function syncPayment(id: string): Promise<PaymentRecord> {
  return paymentRecordSchema.parse(
    await apiRequest<unknown>(`/payments/${id}/sync`, { method: "POST" }),
  );
}

export async function listPayments(): Promise<PaymentRecord[]> {
  const payload = await apiRequest<unknown>("/payments");
  if (!Array.isArray(payload)) {
    throw new Error("Payment list response was invalid.");
  }
  return payload.map((item) => paymentRecordSchema.parse(item));
}
