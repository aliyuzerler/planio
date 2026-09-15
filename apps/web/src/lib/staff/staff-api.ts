import type {
  CreateSpecializationInput,
  CreateStaffInput,
  SpecializationProfile,
  StaffHoursSettings,
  StaffProfile,
  UpdateSpecializationInput,
  UpdateStaffHoursInput,
  UpdateStaffInput,
} from "@xenior/types";
import {
  createSpecializationInputSchema,
  createStaffInputSchema,
  specializationProfileSchema,
  staffHoursSettingsSchema,
  staffProfileSchema,
  updateSpecializationInputSchema,
  updateStaffHoursInputSchema,
  updateStaffInputSchema,
} from "@xenior/validation";
import { apiRequest } from "@/lib/api/client";

export interface StaffFilters {
  isActive?: boolean;
  q?: string;
}

export async function listStaff(
  filters: StaffFilters = {},
): Promise<StaffProfile[]> {
  const params = new URLSearchParams();
  if (filters.isActive !== undefined) {
    params.set("isActive", String(filters.isActive));
  }
  if (filters.q) params.set("q", filters.q);
  const suffix = params.size ? `?${params.toString()}` : "";
  const response = await apiRequest<unknown>(`/staff${suffix}`);
  if (!Array.isArray(response)) throw new Error("Invalid staff response.");
  return response.map((item) => staffProfileSchema.parse(item));
}

export async function getStaff(id: string): Promise<StaffProfile> {
  return staffProfileSchema.parse(
    await apiRequest<unknown>(`/staff/${id}`),
  );
}

export async function createStaff(
  input: CreateStaffInput,
): Promise<StaffProfile> {
  return staffProfileSchema.parse(
    await apiRequest<unknown>("/staff", {
      method: "POST",
      body: createStaffInputSchema.parse(input),
    }),
  );
}

export async function updateStaff(
  id: string,
  input: UpdateStaffInput,
): Promise<StaffProfile> {
  return staffProfileSchema.parse(
    await apiRequest<unknown>(`/staff/${id}`, {
      method: "PATCH",
      body: updateStaffInputSchema.parse(input),
    }),
  );
}

export async function assignSpecialization(
  staffId: string,
  specializationId: string,
): Promise<StaffProfile> {
  return staffProfileSchema.parse(
    await apiRequest<unknown>(`/staff/${staffId}/specializations`, {
      method: "POST",
      body: { specializationId },
    }),
  );
}

export function inviteStaff(id: string): Promise<{ sent: true }> {
  return apiRequest<{ sent: true }>(`/staff/${id}/invite`, { method: "POST" });
}

export async function getStaffHours(id: string): Promise<StaffHoursSettings> {
  return staffHoursSettingsSchema.parse(
    await apiRequest<unknown>(`/staff/${id}/hours`),
  );
}

export async function updateStaffHours(
  id: string,
  input: UpdateStaffHoursInput,
): Promise<StaffHoursSettings> {
  return staffHoursSettingsSchema.parse(
    await apiRequest<unknown>(`/staff/${id}/hours`, {
      method: "PUT",
      body: updateStaffHoursInputSchema.parse(input),
    }),
  );
}

export function unassignSpecialization(
  staffId: string,
  specializationId: string,
): Promise<void> {
  return apiRequest<void>(
    `/staff/${staffId}/specializations/${specializationId}`,
    { method: "DELETE" },
  );
}

export async function listSpecializations(
  isActive?: boolean,
): Promise<SpecializationProfile[]> {
  const suffix =
    isActive === undefined ? "" : `?isActive=${String(isActive)}`;
  const response = await apiRequest<unknown>(`/specializations${suffix}`);
  if (!Array.isArray(response)) {
    throw new Error("Invalid specialization response.");
  }
  return response.map((item) => specializationProfileSchema.parse(item));
}

export async function createSpecialization(
  input: CreateSpecializationInput,
): Promise<SpecializationProfile> {
  return specializationProfileSchema.parse(
    await apiRequest<unknown>("/specializations", {
      method: "POST",
      body: createSpecializationInputSchema.parse(input),
    }),
  );
}

export async function updateSpecialization(
  id: string,
  input: UpdateSpecializationInput,
): Promise<SpecializationProfile> {
  return specializationProfileSchema.parse(
    await apiRequest<unknown>(`/specializations/${id}`, {
      method: "PATCH",
      body: updateSpecializationInputSchema.parse(input),
    }),
  );
}
