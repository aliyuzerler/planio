"use client";

import { useQueries } from "@tanstack/react-query";
import { listAppointments } from "@/lib/appointments/appointment-api";
import { useBusinessProfile } from "@/lib/business/business-queries";
import { listCustomers } from "@/lib/customers/customer-api";
import { addDaysYmd, formatYmdInTimeZone } from "@/lib/datetime/business-date";
import { listStaff } from "@/lib/staff/staff-api";
import { useAuthStore } from "@/stores/auth-store";

export function useDashboardOverview() {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  const role = useAuthStore((state) =>
    state.memberships.find((item) => item.businessId === state.selectedBusinessId)
      ?.role,
  );
  const business = useBusinessProfile();
  const timeZone = business.data?.timezone ?? "UTC";
  const today = formatYmdInTimeZone(new Date(), timeZone);
  const upcomingTo = addDaysYmd(today, 13);
  const operational = role !== "ACCOUNTANT";
  const enabled = Boolean(businessId && business.data && operational);

  const [todayQuery, upcomingQuery, completedQuery, cancelledQuery, customersQuery, staffQuery] =
    useQueries({
      queries: [
        {
          queryKey: ["dashboard", businessId, "today", today],
          queryFn: () => listAppointments({ date: today, pageSize: 100 }),
          enabled,
        },
        {
          queryKey: ["dashboard", businessId, "upcoming", today, upcomingTo],
          queryFn: () =>
            listAppointments({
              from: today,
              to: upcomingTo,
              status: "CONFIRMED",
              pageSize: 100,
            }),
          enabled,
        },
        {
          queryKey: ["dashboard", businessId, "completed", today],
          queryFn: () =>
            listAppointments({
              date: today,
              status: "COMPLETED",
              pageSize: 1,
            }),
          enabled,
        },
        {
          queryKey: ["dashboard", businessId, "cancelled", today],
          queryFn: () =>
            listAppointments({
              date: today,
              status: "CANCELLED",
              pageSize: 1,
            }),
          enabled,
        },
        {
          queryKey: ["dashboard", businessId, "customers"],
          queryFn: () => listCustomers({ pageSize: 1 }),
          enabled: Boolean(businessId) && operational,
        },
        {
          queryKey: ["dashboard", businessId, "staff"],
          queryFn: () => listStaff({ isActive: true }),
          enabled: Boolean(businessId) && operational,
        },
      ],
    });

  const upcomingItems = upcomingQuery.data?.items ?? [];

  return {
    isLoading:
      business.isLoading ||
      todayQuery.isLoading ||
      upcomingQuery.isLoading ||
      completedQuery.isLoading ||
      cancelledQuery.isLoading ||
      customersQuery.isLoading ||
      staffQuery.isLoading,
    isError:
      business.isError ||
      todayQuery.isError ||
      upcomingQuery.isError ||
      completedQuery.isError ||
      cancelledQuery.isError ||
      customersQuery.isError ||
      staffQuery.isError,
    today,
    todayAppointments: todayQuery.data?.items ?? [],
    todayCount: todayQuery.data?.total ?? 0,
    upcomingAppointments: upcomingItems,
    upcomingCount: upcomingItems.length,
    completedCount: completedQuery.data?.total ?? 0,
    cancelledCount: cancelledQuery.data?.total ?? 0,
    customerCount: customersQuery.data?.total ?? 0,
    staffCount: staffQuery.data?.length ?? 0,
  };
}
