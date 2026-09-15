import type {
  CashAccountRecord,
  CreateCashAccountInput,
  CreateCollectionInput,
  CreateCounterSaleInput,
  CreateExpenseInput,
  ExpenseRecord,
  LedgerCustomerRecord,
  LedgerEntryRecord,
  PaginatedResponse,
  SaleRecord,
  SalesReceiptRecord,
  UpdateCashAccountInput,
} from "@xenior/types";
import {
  cashAccountRecordSchema,
  createCashAccountInputSchema,
  createCollectionInputSchema,
  createCounterSaleInputSchema,
  createExpenseInputSchema,
  expenseRecordSchema,
  ledgerCustomerRecordSchema,
  paginatedExpenseSchema,
  paginatedLedgerEntrySchema,
  paginatedSaleSchema,
  saleRecordSchema,
  salesReceiptRecordSchema,
  updateCashAccountInputSchema,
} from "@xenior/validation";
import { apiRequest } from "@/lib/api/client";

export async function listCashAccounts(): Promise<CashAccountRecord[]> {
  const response = await apiRequest<unknown>("/cash-accounts");
  if (!Array.isArray(response)) throw new Error("Invalid cash accounts response.");
  return response.map((item) => cashAccountRecordSchema.parse(item));
}

export async function createCashAccount(
  input: CreateCashAccountInput,
): Promise<CashAccountRecord> {
  return cashAccountRecordSchema.parse(
    await apiRequest<unknown>("/cash-accounts", {
      method: "POST",
      body: createCashAccountInputSchema.parse(input),
    }),
  );
}

export async function updateCashAccount(
  id: string,
  input: UpdateCashAccountInput,
): Promise<CashAccountRecord> {
  return cashAccountRecordSchema.parse(
    await apiRequest<unknown>(`/cash-accounts/${id}`, {
      method: "PATCH",
      body: updateCashAccountInputSchema.parse(input),
    }),
  );
}

export async function listSales(filters: {
  customerId?: string;
  appointmentId?: string;
  status?: "OPEN" | "SETTLED";
}): Promise<PaginatedResponse<SaleRecord>> {
  const params = new URLSearchParams();
  if (filters.customerId) params.set("customerId", filters.customerId);
  if (filters.appointmentId) params.set("appointmentId", filters.appointmentId);
  if (filters.status) params.set("status", filters.status);
  params.set("page", "1");
  params.set("pageSize", "50");
  return paginatedSaleSchema.parse(
    await apiRequest<unknown>(`/sales?${params}`),
  );
}

export async function getSale(id: string): Promise<SaleRecord> {
  return saleRecordSchema.parse(await apiRequest<unknown>(`/sales/${id}`));
}

export async function createCounterSale(
  input: CreateCounterSaleInput,
): Promise<SaleRecord> {
  return saleRecordSchema.parse(
    await apiRequest<unknown>("/sales", {
      method: "POST",
      body: createCounterSaleInputSchema.parse(input),
    }),
  );
}

export async function collectSale(
  id: string,
  input: CreateCollectionInput,
): Promise<SaleRecord> {
  return saleRecordSchema.parse(
    await apiRequest<unknown>(`/sales/${id}/collections`, {
      method: "POST",
      body: createCollectionInputSchema.parse(input),
    }),
  );
}

export async function issueSaleReceipt(id: string): Promise<SalesReceiptRecord> {
  return salesReceiptRecordSchema.parse(
    await apiRequest<unknown>(`/sales/${id}/receipt`, { method: "POST" }),
  );
}

export async function getSaleReceipt(id: string): Promise<SalesReceiptRecord> {
  return salesReceiptRecordSchema.parse(
    await apiRequest<unknown>(`/sales/${id}/receipt`),
  );
}

export async function listExpenses(): Promise<PaginatedResponse<ExpenseRecord>> {
  return paginatedExpenseSchema.parse(
    await apiRequest<unknown>("/expenses?page=1&pageSize=50"),
  );
}

export async function createExpense(
  input: CreateExpenseInput,
): Promise<ExpenseRecord> {
  return expenseRecordSchema.parse(
    await apiRequest<unknown>("/expenses", {
      method: "POST",
      body: createExpenseInputSchema.parse(input),
    }),
  );
}

export async function listLedgerEntries(
  customerId?: string,
): Promise<PaginatedResponse<LedgerEntryRecord>> {
  const params = new URLSearchParams({ page: "1", pageSize: "50" });
  if (customerId) params.set("customerId", customerId);
  return paginatedLedgerEntrySchema.parse(
    await apiRequest<unknown>(`/ledger/entries?${params}`),
  );
}

export async function listLedgerCustomers(): Promise<LedgerCustomerRecord[]> {
  const response = await apiRequest<unknown>("/ledger/customers");
  if (!Array.isArray(response)) throw new Error("Invalid ledger customers response.");
  return response.map((item) => ledgerCustomerRecordSchema.parse(item));
}
