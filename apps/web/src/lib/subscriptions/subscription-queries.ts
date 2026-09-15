"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  cancelSubscription,
  getCurrentSubscription,
  getSubscriptionAccess,
  listPlans,
} from "./subscription-api";

function subscriptionKeys(businessId: string | null) {
  return {
    plans: ["subscriptions", "plans", businessId] as const,
    current: ["subscriptions", "current", businessId] as const,
    access: ["subscriptions", "access", businessId] as const,
  };
}

export function usePlans() {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: subscriptionKeys(businessId).plans,
    queryFn: listPlans,
    enabled: Boolean(businessId),
  });
}

export function useCurrentSubscription() {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: subscriptionKeys(businessId).current,
    queryFn: getCurrentSubscription,
    enabled: Boolean(businessId),
  });
}

export function useSubscriptionAccess() {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: subscriptionKeys(businessId).access,
    queryFn: getSubscriptionAccess,
    enabled: Boolean(businessId),
  });
}

async function invalidateSubscriptionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  businessId: string | null,
) {
  const keys = subscriptionKeys(businessId);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.plans }),
    queryClient.invalidateQueries({ queryKey: keys.current }),
    queryClient.invalidateQueries({ queryKey: keys.access }),
  ]);
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: async () => {
      await invalidateSubscriptionQueries(queryClient, businessId);
    },
  });
}
