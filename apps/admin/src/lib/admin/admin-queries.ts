"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BusinessStatus,
  CreateAdminPlanInput,
  ListAdminAuditLogsQuery,
  ListAdminBusinessesQuery,
  ListAdminSubscriptionsQuery,
  UpdateAdminPlanInput,
} from "@xenior/types";
import { useAuthStore } from "@/stores/auth-store";
import {
  getAdminBusiness,
  getAdminDashboard,
  listAdminAuditLogs,
  listAdminBusinesses,
  listAdminPlans,
  listAdminSubscriptions,
  updateAdminBusinessStatus,
  updateAdminPlan,
  createAdminPlan,
} from "./admin-api";

export function useAdminDashboard() {
  const authenticated = useAuthStore((state) => state.status === "authenticated");
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: getAdminDashboard,
    enabled: authenticated,
  });
}

export function useAdminBusinesses(query: ListAdminBusinessesQuery) {
  const authenticated = useAuthStore((state) => state.status === "authenticated");
  return useQuery({
    queryKey: ["admin", "businesses", query],
    queryFn: () => listAdminBusinesses(query),
    enabled: authenticated,
  });
}

export function useAdminBusiness(id: string) {
  const authenticated = useAuthStore((state) => state.status === "authenticated");
  return useQuery({
    queryKey: ["admin", "businesses", id],
    queryFn: () => getAdminBusiness(id),
    enabled: authenticated && Boolean(id),
  });
}

export function useAdminSubscriptions(query: ListAdminSubscriptionsQuery) {
  const authenticated = useAuthStore((state) => state.status === "authenticated");
  return useQuery({
    queryKey: ["admin", "subscriptions", query],
    queryFn: () => listAdminSubscriptions(query),
    enabled: authenticated,
  });
}

export function useAdminAuditLogs(query: ListAdminAuditLogsQuery) {
  const authenticated = useAuthStore((state) => state.status === "authenticated");
  return useQuery({
    queryKey: ["admin", "audit-logs", query],
    queryFn: () => listAdminAuditLogs(query),
    enabled: authenticated,
  });
}

export function useAdminPlans() {
  const authenticated = useAuthStore((state) => state.status === "authenticated");
  return useQuery({
    queryKey: ["admin", "plans"],
    queryFn: listAdminPlans,
    enabled: authenticated,
  });
}

export function useCreateAdminPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdminPlanInput) => createAdminPlan(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
  });
}

export function useUpdateAdminPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateAdminPlanInput;
    }) => updateAdminPlan(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
  });
}

export function useUpdateAdminBusinessStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: BusinessStatus) => updateAdminBusinessStatus(id, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "businesses"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] }),
      ]);
    },
  });
}
