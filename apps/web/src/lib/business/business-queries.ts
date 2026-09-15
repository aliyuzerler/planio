"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateBusinessHoursInput, UpdateBusinessInput } from "@xenior/types";
import {
  getBusinessHours,
  getBusinessProfile,
  updateBusinessHours,
  updateBusinessProfile,
} from "@/lib/business/business-api";
import { useAuthStore } from "@/stores/auth-store";

export function useBusinessProfile() {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["business", businessId],
    queryFn: getBusinessProfile,
    enabled: Boolean(businessId),
  });
}

export function useUpdateBusinessProfile() {
  const queryClient = useQueryClient();
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  const updateBusinessName = useAuthStore(
    (state) => state.updateBusinessName,
  );

  return useMutation({
    mutationFn: (input: UpdateBusinessInput) =>
      updateBusinessProfile(input),
    onSuccess: (business) => {
      if (businessId) {
        updateBusinessName(businessId, business.name);
      }
      queryClient.setQueryData(["business", businessId], business);
    },
  });
}

export function useBusinessHours() {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["business", "hours", businessId],
    queryFn: getBusinessHours,
    enabled: Boolean(businessId),
  });
}

export function useUpdateBusinessHours() {
  const queryClient = useQueryClient();
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useMutation({
    mutationFn: (input: UpdateBusinessHoursInput) => updateBusinessHours(input),
    onSuccess: (hours) => {
      queryClient.setQueryData(["business", "hours", businessId], hours);
    },
  });
}
