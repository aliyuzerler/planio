export type CampaignDiscountType = "PERCENT" | "AMOUNT";

export interface CampaignCandidate {
  id: string;
  name: string;
  discountType: CampaignDiscountType;
  discountValue: string;
}

export interface ResolvedPrice {
  listPrice: string;
  discountAmount: string;
  payableAmount: string;
  campaignId: string | null;
  campaignName: string | null;
}

export function resolvePrice(
  listPrice: string,
  campaigns: CampaignCandidate[],
): ResolvedPrice {
  const listCents = toCents(listPrice);
  let best: CampaignCandidate | null = null;
  let bestDiscount = 0;

  for (const campaign of campaigns) {
    const discount = discountCents(listCents, campaign);
    if (
      discount > bestDiscount ||
      (discount === bestDiscount &&
        best !== null &&
        campaign.id.localeCompare(best.id) < 0 &&
        discount > 0)
    ) {
      best = campaign;
      bestDiscount = discount;
    } else if (!best && discount > 0) {
      best = campaign;
      bestDiscount = discount;
    }
  }

  if (!best || bestDiscount <= 0) {
    return {
      listPrice: fromCents(listCents),
      discountAmount: "0.00",
      payableAmount: fromCents(listCents),
      campaignId: null,
      campaignName: null,
    };
  }

  return {
    listPrice: fromCents(listCents),
    discountAmount: fromCents(bestDiscount),
    payableAmount: fromCents(listCents - bestDiscount),
    campaignId: best.id,
    campaignName: best.name,
  };
}

export function campaignAppliesToService(
  targetedServiceIds: string[],
  serviceId: string,
): boolean {
  return targetedServiceIds.length === 0 || targetedServiceIds.includes(serviceId);
}

export function campaignCoversInstant(
  startsAt: Date,
  endsAt: Date,
  at: Date,
): boolean {
  return startsAt.getTime() <= at.getTime() && at.getTime() <= endsAt.getTime();
}

function discountCents(
  listCents: number,
  campaign: CampaignCandidate,
): number {
  if (campaign.discountType === "PERCENT") {
    return Math.min(
      listCents,
      Math.round((listCents * Number(campaign.discountValue)) / 100),
    );
  }
  return Math.min(listCents, toCents(campaign.discountValue));
}

function toCents(value: string): number {
  const [whole = "0", fraction = "00"] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

function fromCents(cents: number): string {
  const safe = Math.max(0, Math.round(cents));
  return `${Math.floor(safe / 100)}.${String(safe % 100).padStart(2, "0")}`;
}
