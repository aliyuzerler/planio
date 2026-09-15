import type {
  BusinessHoursSettings,
  BusinessProfile,
  DataExportRecord,
  DataRequestRecord,
  InviteAccountantInput,
  UpdateBusinessHoursInput,
  UpdateBusinessInput,
} from "@xenior/types";
import {
  businessHoursSettingsSchema,
  businessProfileSchema,
  dataExportRecordSchema,
  dataRequestRecordSchema,
  inviteAccountantInputSchema,
  updateBusinessHoursInputSchema,
  updateBusinessInputSchema,
} from "@xenior/validation";
import { apiRequest } from "@/lib/api/client";

export async function getBusinessProfile(): Promise<BusinessProfile> {
  const response = await apiRequest<unknown>("/business");
  return businessProfileSchema.parse(response);
}

export async function updateBusinessProfile(
  input: UpdateBusinessInput,
): Promise<BusinessProfile> {
  const validated = updateBusinessInputSchema.parse(input);
  const response = await apiRequest<unknown>("/business", {
    method: "PATCH",
    body: validated,
  });
  return businessProfileSchema.parse(response);
}

export async function getBusinessHours(): Promise<BusinessHoursSettings> {
  return businessHoursSettingsSchema.parse(
    await apiRequest<unknown>("/business/hours"),
  );
}

export async function updateBusinessHours(
  input: UpdateBusinessHoursInput,
): Promise<BusinessHoursSettings> {
  return businessHoursSettingsSchema.parse(
    await apiRequest<unknown>("/business/hours", {
      method: "PUT",
      body: updateBusinessHoursInputSchema.parse(input),
    }),
  );
}

export async function exportBusinessData(): Promise<DataExportRecord> {
  return dataExportRecordSchema.parse(
    await apiRequest<unknown>("/privacy/export"),
  );
}

export async function requestBusinessErase(): Promise<DataRequestRecord> {
  return dataRequestRecordSchema.parse(
    await apiRequest<unknown>("/privacy/erase", { method: "POST" }),
  );
}

export function inviteAccountant(
  input: InviteAccountantInput,
): Promise<{ sent: true }> {
  return apiRequest<{ sent: true }>("/business/accountant-invites", {
    method: "POST",
    body: inviteAccountantInputSchema.parse(input),
  });
}
