import type {
  AppointmentRecord,
  CreateAppointmentInput,
  PaginatedResponse,
  PaymentLinkRecord,
  RescheduleAppointmentInput,
  UpdateAppointmentInput,
} from "@xenior/types";
import {
  appointmentRecordSchema,
  createAppointmentInputSchema,
  paginatedAppointmentSchema,
  paymentLinkRecordSchema,
  rescheduleAppointmentInputSchema,
  updateAppointmentInputSchema,
} from "@xenior/validation";
import { apiRequest } from "@/lib/api/client";

export interface AppointmentFilters {
  date?: string;
  from?: string;
  to?: string;
  staffId?: string;
  customerId?: string;
  status?: AppointmentRecord["status"];
  page?: number;
  pageSize?: number;
}

const CALENDAR_PAGE_SIZE = 100;
const CALENDAR_MAX_PAGES = 5;

export async function listAppointments(
  filters: AppointmentFilters = {},
): Promise<PaginatedResponse<AppointmentRecord>> {
  const params = new URLSearchParams();
  if (filters.date) params.set("date", filters.date);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.staffId) params.set("staffId", filters.staffId);
  if (filters.customerId) params.set("customerId", filters.customerId);
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 25));
  return paginatedAppointmentSchema.parse(
    await apiRequest<unknown>(`/appointments?${params.toString()}`),
  );
}

export async function listCalendarAppointments(
  filters: Omit<AppointmentFilters, "page" | "pageSize">,
): Promise<AppointmentRecord[]> {
  const items: AppointmentRecord[] = [];
  for (let page = 1; page <= CALENDAR_MAX_PAGES; page += 1) {
    const result = await listAppointments({
      ...filters,
      page,
      pageSize: CALENDAR_PAGE_SIZE,
    });
    items.push(...result.items);
    if (!result.hasMore) break;
  }
  return items;
}

export async function getAppointment(id: string): Promise<AppointmentRecord> {
  return appointmentRecordSchema.parse(
    await apiRequest<unknown>(`/appointments/${id}`),
  );
}

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<AppointmentRecord> {
  return appointmentRecordSchema.parse(
    await apiRequest<unknown>("/appointments", {
      method: "POST",
      body: createAppointmentInputSchema.parse(input),
    }),
  );
}

export async function updateAppointment(
  id: string,
  input: UpdateAppointmentInput,
): Promise<AppointmentRecord> {
  return appointmentRecordSchema.parse(
    await apiRequest<unknown>(`/appointments/${id}`, {
      method: "PATCH",
      body: updateAppointmentInputSchema.parse(input),
    }),
  );
}

export async function rescheduleAppointment(
  id: string,
  input: RescheduleAppointmentInput,
): Promise<AppointmentRecord> {
  return appointmentRecordSchema.parse(
    await apiRequest<unknown>(`/appointments/${id}/reschedule`, {
      method: "POST",
      body: rescheduleAppointmentInputSchema.parse(input),
    }),
  );
}

export function cancelAppointment(id: string): Promise<AppointmentRecord> {
  return action(id, "cancel");
}

export function completeAppointment(id: string): Promise<AppointmentRecord> {
  return action(id, "complete");
}

export function markAppointmentNoShow(id: string): Promise<AppointmentRecord> {
  return action(id, "no-show");
}

export async function createAppointmentPaymentLink(
  id: string,
): Promise<PaymentLinkRecord> {
  return paymentLinkRecordSchema.parse(
    await apiRequest<unknown>(`/checkout/appointments/${id}/link`, {
      method: "POST",
    }),
  );
}

async function action(
  id: string,
  path: "cancel" | "complete" | "no-show",
): Promise<AppointmentRecord> {
  return appointmentRecordSchema.parse(
    await apiRequest<unknown>(`/appointments/${id}/${path}`, { method: "POST" }),
  );
}
