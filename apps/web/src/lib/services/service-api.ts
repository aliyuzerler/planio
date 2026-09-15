import type {
  CreateServiceInput,
  ServiceProfile,
  UpdateServiceInput,
} from "@xenior/types";
import {
  createServiceInputSchema,
  serviceProfileSchema,
  updateServiceInputSchema,
} from "@xenior/validation";
import { apiRequest } from "@/lib/api/client";

export interface ServiceFilters {
  isActive?: boolean;
  q?: string;
}

export async function listServices(
  filters: ServiceFilters,
): Promise<ServiceProfile[]> {
  const params = new URLSearchParams();
  if (filters.isActive !== undefined) {
    params.set("isActive", String(filters.isActive));
  }
  if (filters.q) params.set("q", filters.q);
  const response = await apiRequest<unknown>(
    `/services${params.size ? `?${params}` : ""}`,
  );
  if (!Array.isArray(response)) throw new Error("Invalid services response.");
  return response.map((item) => serviceProfileSchema.parse(item));
}

export async function getService(id: string): Promise<ServiceProfile> {
  return serviceProfileSchema.parse(
    await apiRequest<unknown>(`/services/${id}`),
  );
}

export async function createService(
  input: CreateServiceInput,
): Promise<ServiceProfile> {
  return serviceProfileSchema.parse(
    await apiRequest<unknown>("/services", {
      method: "POST",
      body: createServiceInputSchema.parse(input),
    }),
  );
}

export async function updateService(
  id: string,
  input: UpdateServiceInput,
): Promise<ServiceProfile> {
  return serviceProfileSchema.parse(
    await apiRequest<unknown>(`/services/${id}`, {
      method: "PATCH",
      body: updateServiceInputSchema.parse(input),
    }),
  );
}
