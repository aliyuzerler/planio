export type CashAccountType = "CASH" | "BANK";
export type SaleSource = "APPOINTMENT" | "COUNTER";
export type SaleStatus = "OPEN" | "SETTLED";
export type CollectionMethod = "CASH" | "CARD" | "LINK";
export type ExpenseCategory =
  | "RENT"
  | "UTILITY"
  | "MATERIAL"
  | "SALARY"
  | "COMMISSION"
  | "OTHER";
export type LedgerEntryType = "SALE" | "COLLECTION";

export interface PartyRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface CashAccountRecord {
  id: string;
  name: string;
  type: CashAccountType;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
  balance: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCashAccountInput {
  name: string;
  type: CashAccountType;
  isDefault?: boolean;
}

export interface UpdateCashAccountInput {
  name?: string;
  type?: CashAccountType;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface SaleLineRecord {
  id: string;
  serviceId: string | null;
  nameSnapshot: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  listPriceSnapshot: string;
  discountAmountSnapshot: string;
}

export interface CollectionRecord {
  id: string;
  saleId: string;
  cashAccountId: string;
  cashAccountName: string;
  customerId: string;
  amount: string;
  method: CollectionMethod;
  notes: string | null;
  collectedAt: string;
}

export interface SalesReceiptRecord {
  id: string;
  saleId: string;
  receiptNo: string;
  sequence: number;
  issuedAt: string;
  html: string;
}

export interface SaleRecord {
  id: string;
  customer: PartyRef;
  staff: PartyRef | null;
  appointmentId: string | null;
  source: SaleSource;
  status: SaleStatus;
  currency: string;
  totalAmount: string;
  collectedAmount: string;
  remainingAmount: string;
  listPriceSnapshot: string;
  discountAmountSnapshot: string;
  campaignId: string | null;
  campaignNameSnapshot: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lines: SaleLineRecord[];
  collections: CollectionRecord[];
  receipt: { id: string; receiptNo: string; issuedAt: string } | null;
  officialDocument: {
    id: string;
    type: "E_FATURA" | "SMM";
    status: "PENDING" | "ISSUED" | "FAILED";
    documentNo: string | null;
    issuedAt: string | null;
  } | null;
}

export interface CreateCounterSaleInput {
  customerId: string;
  serviceId: string;
  staffId?: string | null;
  notes?: string | null;
}

export interface CreateCollectionInput {
  cashAccountId?: string;
  amount: string;
  method?: CollectionMethod;
  notes?: string | null;
}

export interface ListSalesQuery {
  customerId?: string;
  appointmentId?: string;
  staffId?: string;
  status?: SaleStatus;
  page?: number;
  pageSize?: number;
}

export interface ExpenseRecord {
  id: string;
  cashAccountId: string;
  cashAccountName: string;
  staff: PartyRef | null;
  commissionEntryId: string | null;
  category: ExpenseCategory;
  amount: string;
  currency: string;
  notes: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface CreateExpenseInput {
  cashAccountId?: string;
  category: ExpenseCategory;
  amount: string;
  notes?: string | null;
  staffId?: string | null;
  commissionEntryId?: string | null;
  occurredAt?: string;
}

export interface ListExpensesQuery {
  category?: ExpenseCategory;
  page?: number;
  pageSize?: number;
}

export interface LedgerEntryRecord {
  id: string;
  customer: PartyRef;
  saleId: string | null;
  collectionId: string | null;
  type: LedgerEntryType;
  amount: string;
  balanceAfter: string;
  description: string;
  occurredAt: string;
}

export interface ListLedgerEntriesQuery {
  customerId?: string;
  page?: number;
  pageSize?: number;
}

export interface LedgerCustomerRecord {
  id: string;
  firstName: string;
  lastName: string;
  ledgerBalance: string;
}
