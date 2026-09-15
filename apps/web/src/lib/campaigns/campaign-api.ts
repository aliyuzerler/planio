import type {
  CampaignRecord,
  CreateCampaignInput,
  PriceQuote,
  UpdateCampaignInput,
} from "@xenior/types";
import {
  campaignRecordSchema,
  createCampaignInputSchema,
  priceQuoteSchema,
  updateCampaignInputSchema,
} from "@xenior/validation";
import { apiRequest } from "@/lib/api/client";

export async function listCampaigns(
  isActive?: boolean,
): Promise<CampaignRecord[]> {
  const params = new URLSearchParams();
  if (isActive !== undefined) params.set("isActive", String(isActive));
  const suffix = params.size ? `?${params}` : "";
  const response = await apiRequest<unknown>(`/campaigns${suffix}`);
  if (!Array.isArray(response)) throw new Error("Invalid campaigns response.");
  return response.map((item) => campaignRecordSchema.parse(item));
}

export async function getCampaign(id: string): Promise<CampaignRecord> {
  return campaignRecordSchema.parse(await apiRequest<unknown>(`/campaigns/${id}`));
}

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<CampaignRecord> {
  return campaignRecordSchema.parse(
    await apiRequest<unknown>("/campaigns", {
      method: "POST",
      body: createCampaignInputSchema.parse(input),
    }),
  );
}

export async function updateCampaign(
  id: string,
  input: UpdateCampaignInput,
): Promise<CampaignRecord> {
  return campaignRecordSchema.parse(
    await apiRequest<unknown>(`/campaigns/${id}`, {
      method: "PATCH",
      body: updateCampaignInputSchema.parse(input),
    }),
  );
}

export async function quotePrice(
  serviceId: string,
  at?: string,
): Promise<PriceQuote> {
  const params = new URLSearchParams({ serviceId });
  if (at) params.set("at", at);
  return priceQuoteSchema.parse(
    await apiRequest<unknown>(`/campaigns/quote?${params}`),
  );
}
