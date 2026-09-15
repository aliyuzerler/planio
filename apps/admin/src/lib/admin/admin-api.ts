import type {
  AdminBusinessDetail,
  AdminDashboardMetrics,
  BusinessStatus,
  CreateAdminPlanInput,
  ListAdminAuditLogsQuery,
  ListAdminBusinessesQuery,
  ListAdminSubscriptionsQuery,
  PaginatedAdminAuditLogs,
  PaginatedAdminBusinesses,
  PaginatedAdminSubscriptions,
  PlanRecord,
  UpdateAdminPlanInput,
} from "@xenior/types";
import { apiRequest, toQuery } from "@/lib/api/client";

export function getAdminDashboard(): Promise<AdminDashboardMetrics> {
  return apiRequest("/admin/dashboard");
}

export function listAdminBusinesses(
  query: ListAdminBusinessesQuery,
): Promise<PaginatedAdminBusinesses> {
  return apiRequest(`/admin/businesses${toQuery(query)}`);
}

export function getAdminBusiness(id: string): Promise<AdminBusinessDetail> {
  return apiRequest(`/admin/businesses/${id}`);
}

export function updateAdminBusinessStatus(
  id: string,
  status: BusinessStatus,
): Promise<AdminBusinessDetail> {
  return apiRequest(`/admin/businesses/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export function listAdminSubscriptions(
  query: ListAdminSubscriptionsQuery,
): Promise<PaginatedAdminSubscriptions> {
  return apiRequest(`/admin/subscriptions${toQuery(query)}`);
}

export function listAdminPlans(): Promise<PlanRecord[]> {
  return apiRequest("/admin/plans");
}

export function createAdminPlan(input: CreateAdminPlanInput): Promise<PlanRecord> {
  return apiRequest("/admin/plans", {
    method: "POST",
    body: input,
  });
}

export function updateAdminPlan(
  id: string,
  input: UpdateAdminPlanInput,
): Promise<PlanRecord> {
  return apiRequest(`/admin/plans/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function listAdminAuditLogs(
  query: ListAdminAuditLogsQuery,
): Promise<PaginatedAdminAuditLogs> {
  return apiRequest(`/admin/audit-logs${toQuery(query)}`);
}
