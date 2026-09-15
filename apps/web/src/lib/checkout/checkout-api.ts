import type {
  PublicCheckoutRecord,
  TenantPaymentSettingsRecord,
  UpsertTenantPaymentSettingsInput,
} from "@xenior/types";
import {
  publicCheckoutRecordSchema,
  tenantPaymentSettingsRecordSchema,
  upsertTenantPaymentSettingsInputSchema,
} from "@xenior/validation";
import { apiRequest } from "@/lib/api/client";
import { getPublicApiUrl } from "@/lib/env";
import { normalizeApiError } from "@/lib/api/errors";

export async function getTenantPaymentSettings(): Promise<TenantPaymentSettingsRecord> {
  return tenantPaymentSettingsRecordSchema.parse(
    await apiRequest<unknown>("/integrations/payments"),
  );
}

export async function upsertTenantPaymentSettings(
  input: UpsertTenantPaymentSettingsInput,
): Promise<TenantPaymentSettingsRecord> {
  return tenantPaymentSettingsRecordSchema.parse(
    await apiRequest<unknown>("/integrations/payments", {
      method: "PATCH",
      body: upsertTenantPaymentSettingsInputSchema.parse(input),
    }),
  );
}

async function publicCheckoutRequest<T>(
  path: string,
  method: "GET" | "POST" = "GET",
): Promise<T> {
  const response = await fetch(`${getPublicApiUrl()}${path}`, {
    method,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw normalizeApiError(await response.json().catch(() => null));
  }
  return (await response.json()) as T;
}

export async function getPublicCheckout(token: string): Promise<PublicCheckoutRecord> {
  return publicCheckoutRecordSchema.parse(
    await publicCheckoutRequest<unknown>(`/checkout/${token}`),
  );
}

export async function completePublicCheckout(
  token: string,
): Promise<PublicCheckoutRecord> {
  return publicCheckoutRecordSchema.parse(
    await publicCheckoutRequest<unknown>(`/checkout/${token}/complete`, "POST"),
  );
}
