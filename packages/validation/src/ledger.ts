import { z } from "zod";
import type {
  CashAccountRecord,
  CreateCashAccountInput,
  CreateCollectionInput,
  CreateCounterSaleInput,
  CreateExpenseInput,
  ExpenseRecord,
  LedgerCustomerRecord,
  LedgerEntryRecord,
  ListExpensesQuery,
  ListLedgerEntriesQuery,
  ListSalesQuery,
  PaginatedResponse,
  SaleRecord,
  SalesReceiptRecord,
  UpdateCashAccountInput,
} from "@xenior/types";
import { servicePriceSchema } from "./service";

export const cashAccountTypeSchema = z.enum(["CASH", "BANK"]);
export const saleSourceSchema = z.enum(["APPOINTMENT", "COUNTER"]);
export const saleStatusSchema = z.enum(["OPEN", "SETTLED"]);
export const collectionMethodSchema = z.enum(["CASH", "CARD", "LINK"]);
export const expenseCategorySchema = z.enum([
  "RENT",
  "UTILITY",
  "MATERIAL",
  "SALARY",
  "COMMISSION",
  "OTHER",
]);
export const ledgerEntryTypeSchema = z.enum(["SALE", "COLLECTION"]);

const partySchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
});

const moneySchema = servicePriceSchema;
const signedMoneySchema = z.string().regex(/^-?\d{1,10}\.\d{2}$/);

export const cashAccountRecordSchema: z.ZodType<CashAccountRecord> = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: cashAccountTypeSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  balance: signedMoneySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createCashAccountInputSchema: z.ZodType<CreateCashAccountInput> = z
  .object({
    name: z.string().trim().min(1).max(120),
    type: cashAccountTypeSchema,
    isDefault: z.boolean().optional(),
  })
  .strict();

export const updateCashAccountInputSchema: z.ZodType<UpdateCashAccountInput> = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    type: cashAccountTypeSchema.optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "En az bir kasa alanı girilmelidir.",
  });

const saleLineSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid().nullable(),
  nameSnapshot: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: moneySchema,
  lineTotal: moneySchema,
  listPriceSnapshot: moneySchema,
  discountAmountSnapshot: moneySchema,
});

const collectionRecordSchema = z.object({
  id: z.string().uuid(),
  saleId: z.string().uuid(),
  cashAccountId: z.string().uuid(),
  cashAccountName: z.string(),
  customerId: z.string().uuid(),
  amount: moneySchema,
  method: collectionMethodSchema,
  notes: z.string().nullable(),
  collectedAt: z.string().datetime(),
});

export const saleRecordSchema: z.ZodType<SaleRecord> = z.object({
  id: z.string().uuid(),
  customer: partySchema,
  staff: partySchema.nullable(),
  appointmentId: z.string().uuid().nullable(),
  source: saleSourceSchema,
  status: saleStatusSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  totalAmount: moneySchema,
  collectedAmount: moneySchema,
  remainingAmount: moneySchema,
  listPriceSnapshot: moneySchema,
  discountAmountSnapshot: moneySchema,
  campaignId: z.string().uuid().nullable(),
  campaignNameSnapshot: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lines: z.array(saleLineSchema),
  collections: z.array(collectionRecordSchema),
  receipt: z
    .object({
      id: z.string().uuid(),
      receiptNo: z.string(),
      issuedAt: z.string().datetime(),
    })
    .nullable(),
  officialDocument: z
    .object({
      id: z.string().uuid(),
      type: z.enum(["E_FATURA", "SMM"]),
      status: z.enum(["PENDING", "ISSUED", "FAILED"]),
      documentNo: z.string().nullable(),
      issuedAt: z.string().datetime().nullable(),
    })
    .nullable(),
});

export const paginatedSaleSchema: z.ZodType<PaginatedResponse<SaleRecord>> =
  z.object({
    items: z.array(saleRecordSchema),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  });

export const createCounterSaleInputSchema: z.ZodType<CreateCounterSaleInput> = z
  .object({
    customerId: z.string().uuid(),
    serviceId: z.string().uuid(),
    staffId: z.string().uuid().nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export const createCollectionInputSchema: z.ZodType<CreateCollectionInput> = z
  .object({
    cashAccountId: z.string().uuid().optional(),
    amount: moneySchema,
    method: collectionMethodSchema.optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export const listSalesQuerySchema: z.ZodType<ListSalesQuery> = z.object({
  customerId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  status: saleStatusSchema.optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const salesReceiptRecordSchema: z.ZodType<SalesReceiptRecord> = z.object({
  id: z.string().uuid(),
  saleId: z.string().uuid(),
  receiptNo: z.string(),
  sequence: z.number().int().positive(),
  issuedAt: z.string().datetime(),
  html: z.string(),
});

export const expenseRecordSchema: z.ZodType<ExpenseRecord> = z.object({
  id: z.string().uuid(),
  cashAccountId: z.string().uuid(),
  cashAccountName: z.string(),
  staff: partySchema.nullable(),
  commissionEntryId: z.string().uuid().nullable(),
  category: expenseCategorySchema,
  amount: moneySchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  notes: z.string().nullable(),
  occurredAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export const paginatedExpenseSchema: z.ZodType<PaginatedResponse<ExpenseRecord>> =
  z.object({
    items: z.array(expenseRecordSchema),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  });

export const createExpenseInputSchema: z.ZodType<CreateExpenseInput> = z
  .object({
    cashAccountId: z.string().uuid().optional(),
    category: expenseCategorySchema,
    amount: moneySchema,
    notes: z.string().trim().max(500).nullable().optional(),
    staffId: z.string().uuid().nullable().optional(),
    commissionEntryId: z.string().uuid().nullable().optional(),
    occurredAt: z.string().datetime().optional(),
  })
  .strict();

export const listExpensesQuerySchema: z.ZodType<ListExpensesQuery> = z.object({
  category: expenseCategorySchema.optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const ledgerEntryRecordSchema: z.ZodType<LedgerEntryRecord> = z.object({
  id: z.string().uuid(),
  customer: partySchema,
  saleId: z.string().uuid().nullable(),
  collectionId: z.string().uuid().nullable(),
  type: ledgerEntryTypeSchema,
  amount: signedMoneySchema,
  balanceAfter: signedMoneySchema,
  description: z.string(),
  occurredAt: z.string().datetime(),
});

export const paginatedLedgerEntrySchema: z.ZodType<
  PaginatedResponse<LedgerEntryRecord>
> = z.object({
  items: z.array(ledgerEntryRecordSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export const listLedgerEntriesQuerySchema: z.ZodType<ListLedgerEntriesQuery> =
  z.object({
    customerId: z.string().uuid().optional(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(100).optional(),
  });

export const ledgerCustomerRecordSchema: z.ZodType<LedgerCustomerRecord> =
  z.object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
    ledgerBalance: signedMoneySchema,
  });
