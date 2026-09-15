"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePaymentCheckoutInput } from "@xenior/types";
import { useAuthStore } from "@/stores/auth-store";
import {
  createPaymentCheckout,
  listPayments,
  syncPayment,
} from "./payment-api";

export function usePayments() {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["payments", businessId],
    queryFn: listPayments,
    enabled: Boolean(businessId),
  });
}

export function useCreatePaymentCheckout() {
  const queryClient = useQueryClient();
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useMutation({
    mutationFn: async (input: CreatePaymentCheckoutInput) => {
      const session = await createPaymentCheckout(input);
      const hosted = session.checkout.paymentPageUrl;
      if (hosted && !hosted.startsWith(window.location.origin)) {
        window.location.assign(hosted);
        return session;
      }
      const payment = await syncPayment(session.payment.id);
      return { ...session, payment };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["payments", businessId] }),
        queryClient.invalidateQueries({ queryKey: ["subscriptions"] }),
      ]);
    },
  });
}
