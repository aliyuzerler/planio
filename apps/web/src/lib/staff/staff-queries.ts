"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  getStaff,
  listSpecializations,
  listStaff,
  type StaffFilters,
} from "./staff-api";

export function useStaffList(filters: StaffFilters) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["staff", businessId, filters],
    queryFn: () => listStaff(filters),
    enabled: Boolean(businessId),
  });
}

export function useStaffDetail(id: string) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["staff", businessId, id],
    queryFn: () => getStaff(id),
    enabled: Boolean(businessId && id),
  });
}

export function useSpecializations(isActive?: boolean) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["specializations", businessId, isActive],
    queryFn: () => listSpecializations(isActive),
    enabled: Boolean(businessId),
  });
}

export function useCanManageStaff(): boolean {
  const membership = useAuthStore((state) =>
    state.memberships.find(
      (item) => item.businessId === state.selectedBusinessId,
    ),
  );
  return (
    membership?.role === "BUSINESS_OWNER" ||
    membership?.role === "BUSINESS_ADMIN"
  );
}
