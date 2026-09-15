import type {
  PlanRecord,
  SubscriptionAccess,
  SubscriptionRecord,
} from "@xenior/types";
import {
  planRecordSchema,
  subscriptionAccessSchema,
  subscriptionRecordSchema,
} from "@xenior/validation";
import { apiRequest } from "@/lib/api/client";

export async function listPlans(): Promise<PlanRecord[]> {
  const payload = await apiRequest<unknown>("/plans");
  if (!Array.isArray(payload)) {
    throw new Error("Plan catalog response was invalid.");
  }
  return payload.map((item) => planRecordSchema.parse(item));
}

export async function getCurrentSubscription(): Promise<SubscriptionRecord | null> {
  return subscriptionRecordSchema.nullable().parse(
    await apiRequest<unknown>("/subscriptions/current"),
  );
}

export async function getSubscriptionAccess(): Promise<SubscriptionAccess> {
  return subscriptionAccessSchema.parse(
    await apiRequest<unknown>("/subscriptions/access"),
  );
}

export async function cancelSubscription(): Promise<SubscriptionRecord> {
  return subscriptionRecordSchema.parse(
    await apiRequest<unknown>("/subscriptions/cancel", { method: "POST" }),
  );
}
