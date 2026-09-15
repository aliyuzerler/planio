import type {
  CreateResourceInput,
  ResourceProfile,
  UpdateResourceInput,
} from "@xenior/types";
import {
  createResourceInputSchema,
  resourceProfileSchema,
  updateResourceInputSchema,
} from "@xenior/validation";
import { apiRequest } from "@/lib/api/client";

export interface ResourceFilters {
  isActive?: boolean;
  q?: string;
}

export async function listResources(
  filters: ResourceFilters = {},
): Promise<ResourceProfile[]> {
  const params = new URLSearchParams();
  if (filters.isActive !== undefined) {
    params.set("isActive", String(filters.isActive));
  }
  if (filters.q) params.set("q", filters.q);
  const suffix = params.size ? `?${params.toString()}` : "";
  const response = await apiRequest<unknown>(`/resources${suffix}`);
  if (!Array.isArray(response)) {
    throw new Error("Invalid resources response.");
  }
  return response.map((item) => resourceProfileSchema.parse(item));
}

export async function createResource(
  input: CreateResourceInput,
): Promise<ResourceProfile> {
  return resourceProfileSchema.parse(
    await apiRequest<unknown>("/resources", {
      method: "POST",
      body: createResourceInputSchema.parse(input),
    }),
  );
}

export async function updateResource(
  id: string,
  input: UpdateResourceInput,
): Promise<ResourceProfile> {
  return resourceProfileSchema.parse(
    await apiRequest<unknown>(`/resources/${id}`, {
      method: "PATCH",
      body: updateResourceInputSchema.parse(input),
    }),
  );
}
