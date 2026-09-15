"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  getCustomer,
  listCustomerAppointments,
  listCustomerFiles,
  listCustomers,
  type CustomerFilters,
} from "./customer-api";

export function useCustomerList(filters: CustomerFilters) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["customers", businessId, filters],
    queryFn: () => listCustomers(filters),
    enabled: Boolean(businessId),
  });
}

export function useCustomerDetail(id: string) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["customers", businessId, id],
    queryFn: () => getCustomer(id),
    enabled: Boolean(businessId && id),
  });
}

export function useCustomerAppointments(id: string, page = 1) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["customers", businessId, id, "appointments", page],
    queryFn: () => listCustomerAppointments(id, page),
    enabled: Boolean(businessId && id),
  });
}

export function useCustomerFiles(id: string) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["customers", businessId, id, "files"],
    queryFn: () => listCustomerFiles(id),
    enabled: Boolean(businessId && id),
  });
}

export function useCanManageCustomers(): boolean {
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
