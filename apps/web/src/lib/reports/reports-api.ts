import type {
  FinanceSummaryReport,
  ListReportsQuery,
  ListTenantAuditLogsQuery,
  PaginatedResponse,
  TenantAuditLogItem,
} from "@xenior/types";
import {
  financeSummaryReportSchema,
  paginatedTenantAuditLogSchema,
} from "@xenior/validation";
import { apiRequest } from "@/lib/api/client";

export async function getFinanceSummary(
  query: ListReportsQuery = {},
): Promise<FinanceSummaryReport> {
  const params = new URLSearchParams();
  if (query.date) params.set("date", query.date);
  const suffix = params.size ? `?${params}` : "";
  return financeSummaryReportSchema.parse(
    await apiRequest<unknown>(`/reports/summary${suffix}`),
  );
}

export async function listTenantAuditLogs(
  filters: ListTenantAuditLogsQuery = {},
): Promise<PaginatedResponse<TenantAuditLogItem>> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 25));
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.action) params.set("action", filters.action);
  return paginatedTenantAuditLogSchema.parse(
    await apiRequest<unknown>(`/audit-logs?${params}`),
  );
}
