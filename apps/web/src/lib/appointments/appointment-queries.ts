"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  getAppointment,
  listAppointments,
  listCalendarAppointments,
  type AppointmentFilters,
} from "./appointment-api";

export function useAppointmentList(filters: AppointmentFilters) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["appointments", businessId, filters],
    queryFn: () => listAppointments(filters),
    enabled: Boolean(businessId),
  });
}

export function useCalendarAppointments(
  filters: Omit<AppointmentFilters, "page" | "pageSize">,
) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["appointments", "calendar", businessId, filters],
    queryFn: () => listCalendarAppointments(filters),
    enabled: Boolean(businessId && (filters.from || filters.date)),
  });
}

export function useAppointmentDetail(id: string) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["appointments", businessId, id],
    queryFn: () => getAppointment(id),
    enabled: Boolean(businessId && id),
  });
}
