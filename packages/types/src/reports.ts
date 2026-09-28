export interface ReportAccountBalance {
  id: string;
  name: string;
  type: "CASH" | "BANK";
  balance: string;
}

export interface ReportExpenseBucket {
  category: string;
  amount: string;
}

export interface FinanceSummaryReport {
  date: string;
  timezone: string;
  currency: string;
  cash: {
    collectionsIn: string;
    expensesOut: string;
    net: string;
    accounts: ReportAccountBalance[];
  };
  receivables: {
    totalOutstanding: string;
    customerCount: number;
  };
  commissions: {
    totalAmount: string;
    entryCount: number;
  };
  expenses: {
    totalAmount: string;
    byCategory: ReportExpenseBucket[];
  };
}

export interface ListReportsQuery {
  date?: string;
}

export interface TenantAuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  /** Human-readable detail for business owners (no technical IDs). */
  summary?: string | null;
  userId: string | null;
  createdAt: string;
}

export interface ListTenantAuditLogsQuery {
  page?: number;
  pageSize?: number;
  /** Inclusive calendar day YYYY-MM-DD in business timezone */
  from?: string;
  /** Inclusive calendar day YYYY-MM-DD in business timezone */
  to?: string;
  /** Exact audit action code, e.g. SALE_CREATED */
  action?: string;
}
