import type {
  CreateCustomerInput,
  CustomerAppointmentHistoryItem,
  CustomerFileKind,
  CustomerFileRecord,
  CustomerProfile,
  PaginatedResponse,
  UpdateCustomerInput,
} from "@xenior/types";
import {
  createCustomerInputSchema,
  customerFileListSchema,
  customerFileRecordSchema,
  customerProfileSchema,
  paginatedCustomerAppointmentHistorySchema,
  paginatedCustomerSchema,
  updateCustomerInputSchema,
} from "@xenior/validation";
import { apiRequest, apiRequestBlob } from "@/lib/api/client";

export interface CustomerFilters {
  isActive?: boolean;
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function listCustomers(
  filters: CustomerFilters = {},
): Promise<PaginatedResponse<CustomerProfile>> {
  const params = new URLSearchParams();
  if (filters.isActive !== undefined) {
    params.set("isActive", String(filters.isActive));
  }
  if (filters.q) params.set("q", filters.q);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 25));
  return paginatedCustomerSchema.parse(
    await apiRequest<unknown>(`/customers?${params.toString()}`),
  );
}

export async function getCustomer(id: string): Promise<CustomerProfile> {
  return customerProfileSchema.parse(
    await apiRequest<unknown>(`/customers/${id}`),
  );
}

export async function listCustomerAppointments(
  id: string,
  page = 1,
  pageSize = 10,
): Promise<PaginatedResponse<CustomerAppointmentHistoryItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  return paginatedCustomerAppointmentHistorySchema.parse(
    await apiRequest<unknown>(`/customers/${id}/appointments?${params}`),
  );
}

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<CustomerProfile> {
  return customerProfileSchema.parse(
    await apiRequest<unknown>("/customers", {
      method: "POST",
      body: createCustomerInputSchema.parse(input),
    }),
  );
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
): Promise<CustomerProfile> {
  return customerProfileSchema.parse(
    await apiRequest<unknown>(`/customers/${id}`, {
      method: "PATCH",
      body: updateCustomerInputSchema.parse(input),
    }),
  );
}

export async function listCustomerFiles(
  customerId: string,
): Promise<CustomerFileRecord[]> {
  return customerFileListSchema.parse(
    await apiRequest<unknown>(`/customers/${customerId}/files`),
  );
}

export async function uploadCustomerFile(
  customerId: string,
  kind: CustomerFileKind,
  file: File,
): Promise<CustomerFileRecord> {
  const body = new FormData();
  body.append("kind", kind);
  body.append("file", file);
  return customerFileRecordSchema.parse(
    await apiRequest<unknown>(`/customers/${customerId}/files`, {
      method: "POST",
      body,
    }),
  );
}

export async function deleteCustomerFile(
  customerId: string,
  fileId: string,
): Promise<void> {
  await apiRequest<unknown>(`/customers/${customerId}/files/${fileId}`, {
    method: "DELETE",
  });
}

export async function downloadCustomerFile(
  customerId: string,
  fileId: string,
  originalName: string,
): Promise<void> {
  const blob = await apiRequestBlob(
    `/customers/${customerId}/files/${fileId}/content`,
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = originalName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
