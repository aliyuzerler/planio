"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  getSale,
  getSaleReceipt,
  listCashAccounts,
  listExpenses,
  listLedgerCustomers,
  listLedgerEntries,
  listSales,
} from "./ledger-api";

export function useCashAccountList(enabled = true) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["cash-accounts", businessId],
    queryFn: listCashAccounts,
    enabled: Boolean(businessId) && enabled,
  });
}

export function useSaleList(filters: {
  customerId?: string;
  appointmentId?: string;
  status?: "OPEN" | "SETTLED";
} = {}) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["sales", businessId, filters],
    queryFn: () => listSales(filters),
    enabled: Boolean(businessId),
  });
}

export function useSaleDetail(id: string) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["sales", businessId, id],
    queryFn: () => getSale(id),
    enabled: Boolean(businessId && id),
  });
}

export function useSaleReceipt(id: string, enabled = true) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["sales", businessId, id, "receipt"],
    queryFn: () => getSaleReceipt(id),
    enabled: Boolean(businessId && id) && enabled,
  });
}

export function useExpenseList() {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["expenses", businessId],
    queryFn: listExpenses,
    enabled: Boolean(businessId),
  });
}

export function useLedgerEntries(customerId?: string, enabled = true) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["ledger-entries", businessId, customerId],
    queryFn: () => listLedgerEntries(customerId),
    enabled: Boolean(businessId) && enabled,
  });
}

export function useLedgerCustomers() {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useQuery({
    queryKey: ["ledger-customers", businessId],
    queryFn: listLedgerCustomers,
    enabled: Boolean(businessId),
  });
}

export function useCanWriteCash(): boolean {
  return useAuthStore((state) => {
    const role = state.memberships.find(
      (item) => item.businessId === state.selectedBusinessId,
    )?.role;
    return role === "BUSINESS_OWNER" || role === "ACCOUNTANT";
  });
}

export function useCanReadCash(): boolean {
  return useAuthStore((state) => {
    const role = state.memberships.find(
      (item) => item.businessId === state.selectedBusinessId,
    )?.role;
    return (
      role === "BUSINESS_OWNER" ||
      role === "BUSINESS_ADMIN" ||
      role === "ACCOUNTANT"
    );
  });
}
