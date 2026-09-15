export type CampaignDiscountType = "PERCENT" | "AMOUNT";

export interface CampaignRecord {
  id: string;
  name: string;
  discountType: CampaignDiscountType;
  discountValue: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  smsTemplate: string | null;
  serviceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignInput {
  name: string;
  discountType: CampaignDiscountType;
  discountValue: string;
  startsAt: string;
  endsAt: string;
  serviceIds?: string[];
  smsTemplate?: string | null;
  isActive?: boolean;
}

export interface UpdateCampaignInput {
  name?: string;
  discountType?: CampaignDiscountType;
  discountValue?: string;
  startsAt?: string;
  endsAt?: string;
  serviceIds?: string[];
  smsTemplate?: string | null;
  isActive?: boolean;
}

export interface ListCampaignsQuery {
  isActive?: boolean;
}

export interface PriceQuote {
  serviceId: string;
  listPrice: string;
  discountAmount: string;
  payableAmount: string;
  currency: string;
  campaignId: string | null;
  campaignName: string | null;
}
