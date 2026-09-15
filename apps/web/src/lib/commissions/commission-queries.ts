"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  getCommissionRule,
  listCommissionEntries,
  listCommissionRules,
} from "./commission-api";

export function useCommissionRuleList(isActive?: boolean) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["commission-rules", businessId, isActive],
    queryFn: () => listCommissionRules(isActive),
    enabled: Boolean(businessId),
  });
}

export function useCommissionRuleDetail(id: string) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["commission-rules", businessId, id],
    queryFn: () => getCommissionRule(id),
    enabled: Boolean(businessId && id),
  });
}

export function useCommissionEntries(staffId?: string, enabled = true) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["commission-entries", businessId, staffId],
    queryFn: () => listCommissionEntries({ staffId, pageSize: 50 }),
    enabled: Boolean(businessId) && enabled,
  });
}

export function useCanManageCommissions(): boolean {
  return useAuthStore((state) => {
    const role = state.memberships.find(
      (item) => item.businessId === state.selectedBusinessId,
    )?.role;
    return role === "BUSINESS_OWNER" || role === "BUSINESS_ADMIN";
  });
}
