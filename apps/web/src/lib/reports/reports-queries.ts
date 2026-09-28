"use client";

import { useQuery } from "@tanstack/react-query";
import type { ListTenantAuditLogsQuery } from "@xenior/types";
import { useAuthStore } from "@/stores/auth-store";
import { getFinanceSummary, listTenantAuditLogs } from "./reports-api";

export function useFinanceSummary(date?: string) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["reports", "summary", businessId, date],
    queryFn: () => getFinanceSummary(date ? { date } : {}),
    enabled: Boolean(businessId),
  });
}

export function useTenantAuditLogs(
  filters: Omit<ListTenantAuditLogsQuery, "page" | "pageSize"> = {},
) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: [
      "audit-logs",
      businessId,
      filters.from ?? null,
      filters.to ?? null,
      filters.action ?? null,
    ],
    queryFn: () =>
      listTenantAuditLogs({
        pageSize: 50,
        from: filters.from || undefined,
        to: filters.to || undefined,
        action: filters.action || undefined,
      }),
    enabled: Boolean(businessId),
  });
}

export function useCanReadReports(): boolean {
  return useAuthStore((state) => {
    const role = state.memberships.find(
      (item) => item.businessId === state.selectedBusinessId,
    )?.role;
    return role === "BUSINESS_OWNER" || role === "ACCOUNTANT";
  });
}
