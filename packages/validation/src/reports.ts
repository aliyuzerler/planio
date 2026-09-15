import { z } from "zod";
import type {
  FinanceSummaryReport,
  ListReportsQuery,
  ListTenantAuditLogsQuery,
  PaginatedResponse,
  TenantAuditLogItem,
} from "@xenior/types";
import { servicePriceSchema } from "./service";
import { cashAccountTypeSchema } from "./ledger";

const moneySchema = servicePriceSchema;
const signedMoneySchema = z.string().regex(/^-?\d{1,10}\.\d{2}$/);

export const listReportsQuerySchema: z.ZodType<ListReportsQuery> = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const financeSummaryReportSchema: z.ZodType<FinanceSummaryReport> =
  z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timezone: z.string(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    cash: z.object({
      collectionsIn: moneySchema,
      expensesOut: moneySchema,
      net: signedMoneySchema,
      accounts: z.array(
        z.object({
          id: z.string().uuid(),
          name: z.string(),
          type: cashAccountTypeSchema,
          balance: signedMoneySchema,
        }),
      ),
    }),
    receivables: z.object({
      totalOutstanding: moneySchema,
      customerCount: z.number().int().nonnegative(),
    }),
    commissions: z.object({
      totalAmount: moneySchema,
      entryCount: z.number().int().nonnegative(),
    }),
    expenses: z.object({
      totalAmount: moneySchema,
      byCategory: z.array(
        z.object({
          category: z.string(),
          amount: moneySchema,
        }),
      ),
    }),
  });

export const tenantAuditLogItemSchema: z.ZodType<TenantAuditLogItem> = z.object({
  id: z.string().uuid(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export const paginatedTenantAuditLogSchema: z.ZodType<
  PaginatedResponse<TenantAuditLogItem>
> = z.object({
  items: z.array(tenantAuditLogItemSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export const listTenantAuditLogsQuerySchema: z.ZodType<ListTenantAuditLogsQuery> =
  z.object({
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(100).optional(),
  });
