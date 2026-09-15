"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { listResources, type ResourceFilters } from "./resource-api";

export function useResourceList(filters: ResourceFilters = {}) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["resources", businessId, filters],
    queryFn: () => listResources(filters),
    enabled: Boolean(businessId),
  });
}

export function useCanManageResources(): boolean {
  return useAuthStore((state) => {
    const role = state.memberships.find(
      (item) => item.businessId === state.selectedBusinessId,
    )?.role;
    return role === "BUSINESS_OWNER" || role === "BUSINESS_ADMIN";
  });
}

export function useBusinessRole() {
  return useAuthStore(
    (state) =>
      state.memberships.find(
        (item) => item.businessId === state.selectedBusinessId,
      )?.role,
  );
}
