import type {
  BroadcastSmsInput,
  BroadcastSmsResult,
  IssueOfficialDocumentInput,
  OfficialDocumentRecord,
  TenantUyumsoftSettingsRecord,
  UpsertTenantUyumsoftSettingsInput,
} from "@xenior/types";
import {
  broadcastSmsInputSchema,
  broadcastSmsResultSchema,
  issueOfficialDocumentInputSchema,
  officialDocumentRecordSchema,
  tenantUyumsoftSettingsRecordSchema,
  upsertTenantUyumsoftSettingsInputSchema,
} from "@xenior/validation";
import { apiRequest } from "@/lib/api/client";

export async function getTenantUyumsoftSettings(): Promise<TenantUyumsoftSettingsRecord> {
  return tenantUyumsoftSettingsRecordSchema.parse(
    await apiRequest<unknown>("/integrations/uyumsoft"),
  );
}

export async function upsertTenantUyumsoftSettings(
  input: UpsertTenantUyumsoftSettingsInput,
): Promise<TenantUyumsoftSettingsRecord> {
  return tenantUyumsoftSettingsRecordSchema.parse(
    await apiRequest<unknown>("/integrations/uyumsoft", {
      method: "PATCH",
      body: upsertTenantUyumsoftSettingsInputSchema.parse(input),
    }),
  );
}

export async function issueOfficialDocument(
  saleId: string,
  input: IssueOfficialDocumentInput,
): Promise<OfficialDocumentRecord> {
  return officialDocumentRecordSchema.parse(
    await apiRequest<unknown>(`/sales/${saleId}/official-document`, {
      method: "POST",
      body: issueOfficialDocumentInputSchema.parse(input),
    }),
  );
}

export async function getOfficialDocument(
  saleId: string,
): Promise<OfficialDocumentRecord> {
  return officialDocumentRecordSchema.parse(
    await apiRequest<unknown>(`/sales/${saleId}/official-document`),
  );
}

export async function broadcastCampaignSms(
  campaignId: string,
  input: BroadcastSmsInput = {},
): Promise<BroadcastSmsResult> {
  return broadcastSmsResultSchema.parse(
    await apiRequest<unknown>(`/campaigns/${campaignId}/broadcast-sms`, {
      method: "POST",
      body: broadcastSmsInputSchema.parse(input),
    }),
  );
}
