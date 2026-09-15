"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  getService,
  listServices,
  type ServiceFilters,
} from "./service-api";

export function useServiceList(filters: ServiceFilters) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["services", businessId, filters],
    queryFn: () => listServices(filters),
    enabled: Boolean(businessId),
  });
}

export function useServiceDetail(id: string) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["services", businessId, id],
    queryFn: () => getService(id),
    enabled: Boolean(businessId && id),
  });
}

export function useCanManageServices(): boolean {
  return useAuthStore((state) => {
    const role = state.memberships.find(
      (item) => item.businessId === state.selectedBusinessId,
    )?.role;
    return role === "BUSINESS_OWNER" || role === "BUSINESS_ADMIN";
  });
}
