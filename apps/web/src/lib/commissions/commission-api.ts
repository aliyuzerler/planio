import type {
  CommissionEntryRecord,
  CommissionRuleRecord,
  CreateCommissionRuleInput,
  PaginatedResponse,
  UpdateCommissionRuleInput,
} from "@xenior/types";
import {
  commissionRuleRecordSchema,
  createCommissionRuleInputSchema,
  paginatedCommissionEntrySchema,
  updateCommissionRuleInputSchema,
} from "@xenior/validation";
import { apiRequest } from "@/lib/api/client";

export async function listCommissionRules(
  isActive?: boolean,
): Promise<CommissionRuleRecord[]> {
  const params = new URLSearchParams();
  if (isActive !== undefined) params.set("isActive", String(isActive));
  const suffix = params.size ? `?${params}` : "";
  const response = await apiRequest<unknown>(`/commissions/rules${suffix}`);
  if (!Array.isArray(response)) {
    throw new Error("Invalid commission rules response.");
  }
  return response.map((item) => commissionRuleRecordSchema.parse(item));
}

export async function getCommissionRule(
  id: string,
): Promise<CommissionRuleRecord> {
  return commissionRuleRecordSchema.parse(
    await apiRequest<unknown>(`/commissions/rules/${id}`),
  );
}

export async function createCommissionRule(
  input: CreateCommissionRuleInput,
): Promise<CommissionRuleRecord> {
  return commissionRuleRecordSchema.parse(
    await apiRequest<unknown>("/commissions/rules", {
      method: "POST",
      body: createCommissionRuleInputSchema.parse(input),
    }),
  );
}

export async function updateCommissionRule(
  id: string,
  input: UpdateCommissionRuleInput,
): Promise<CommissionRuleRecord> {
  return commissionRuleRecordSchema.parse(
    await apiRequest<unknown>(`/commissions/rules/${id}`, {
      method: "PATCH",
      body: updateCommissionRuleInputSchema.parse(input),
    }),
  );
}

export async function listCommissionEntries(filters: {
  staffId?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<CommissionEntryRecord>> {
  const params = new URLSearchParams();
  if (filters.staffId) params.set("staffId", filters.staffId);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 25));
  return paginatedCommissionEntrySchema.parse(
    await apiRequest<unknown>(`/commissions/entries?${params}`),
  );
}
