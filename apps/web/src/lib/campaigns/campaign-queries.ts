"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { getCampaign, listCampaigns, quotePrice } from "./campaign-api";

export function useCampaignList(isActive?: boolean) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["campaigns", businessId, isActive],
    queryFn: () => listCampaigns(isActive),
    enabled: Boolean(businessId),
  });
}

export function useCampaignDetail(id: string) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["campaigns", businessId, id],
    queryFn: () => getCampaign(id),
    enabled: Boolean(businessId && id),
  });
}

export function usePriceQuote(serviceId: string, at: string) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["campaigns", businessId, "quote", serviceId, at],
    queryFn: () => quotePrice(serviceId, at),
    enabled: Boolean(businessId && serviceId && at),
  });
}

export function useCanManageCampaigns(): boolean {
  return useAuthStore((state) => {
    const role = state.memberships.find(
      (item) => item.businessId === state.selectedBusinessId,
    )?.role;
    return role === "BUSINESS_OWNER" || role === "BUSINESS_ADMIN";
  });
}
