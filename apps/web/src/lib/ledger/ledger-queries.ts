"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
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

export function useSaleList(
  filters: {
    customerId?: string;
    appointmentId?: string;
    status?: "OPEN" | "SETTLED";
  } = {},
) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useInfiniteQuery({
    queryKey: ["sales", businessId, filters],
    queryFn: ({ pageParam }) => listSales({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
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
  return useInfiniteQuery({
    queryKey: ["expenses", businessId],
    queryFn: ({ pageParam }) => listExpenses(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: Boolean(businessId),
  });
}

export function useLedgerEntries(customerId?: string, enabled = true) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  return useInfiniteQuery({
    queryKey: ["ledger-entries", businessId, customerId],
    queryFn: ({ pageParam }) => listLedgerEntries(customerId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: Boolean(businessId) && enabled,
  });
}

export function useLedgerCustomers(search = "", enabled = true) {
  const businessId = useAuthStore((state) => state.selectedBusinessId);
  const trimmed = search.trim();
  return useInfiniteQuery({
    queryKey: ["ledger-customers", businessId, trimmed],
    queryFn: ({ pageParam }) =>
      listLedgerCustomers({ page: pageParam, q: trimmed || undefined }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: Boolean(businessId) && enabled,
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
