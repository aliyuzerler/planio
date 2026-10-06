import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type {
  CashAccountRecord,
  ExpenseRecord,
  LedgerCustomerRecord,
  LedgerEntryRecord,
  PaginatedResponse,
  SaleRecord,
  SalesReceiptRecord,
} from "@xenior/types";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import { CashAccountsService } from "./cash-accounts.service";
import { ExpensesService } from "./expenses.service";
import { LedgerService } from "./ledger.service";
import { SalesService } from "./sales.service";
import {
  CreateCashAccountDto,
  CreateCollectionDto,
  CreateCounterSaleDto,
  CreateExpenseDto,
  ListExpensesQueryDto,
  ListLedgerCustomersQueryDto,
  ListLedgerEntriesQueryDto,
  ListSalesQueryDto,
  UpdateCashAccountDto,
} from "./dto/ledger.dto";

const readRoles = [
  "BUSINESS_OWNER",
  "BUSINESS_ADMIN",
  "STAFF",
  "ACCOUNTANT",
] as const;
const cashReadRoles = ["BUSINESS_OWNER", "BUSINESS_ADMIN", "ACCOUNTANT"] as const;
const cashWriteRoles = ["BUSINESS_OWNER", "ACCOUNTANT"] as const;
const accountWriteRoles = ["BUSINESS_OWNER", "ACCOUNTANT"] as const;
const saleWriteRoles = ["BUSINESS_OWNER", "ACCOUNTANT"] as const;

@ApiTags("ledger")
@ApiBearerAuth()
@ApiSecurity("business")
@Controller()
export class LedgerController {
  constructor(
    private readonly cashAccounts: CashAccountsService,
    private readonly sales: SalesService,
    private readonly expenses: ExpensesService,
    private readonly ledger: LedgerService,
  ) {}

  @Get("cash-accounts")
  @RequireBusinessRoles(...cashReadRoles)
  listAccounts(): Promise<CashAccountRecord[]> {
    return this.cashAccounts.list();
  }

  @Post("cash-accounts")
  @RequireBusinessRoles(...accountWriteRoles)
  createAccount(@Body() input: CreateCashAccountDto): Promise<CashAccountRecord> {
    return this.cashAccounts.create(input);
  }

  @Patch("cash-accounts/:id")
  @RequireBusinessRoles(...accountWriteRoles)
  updateAccount(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UpdateCashAccountDto,
  ): Promise<CashAccountRecord> {
    return this.cashAccounts.update(id, input);
  }

  @Delete("cash-accounts/:id")
  @RequireBusinessRoles(...accountWriteRoles)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateAccount(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<void> {
    await this.cashAccounts.deactivate(id);
  }

  @Get("sales")
  @RequireBusinessRoles(...readRoles)
  listSales(
    @Query() query: ListSalesQueryDto,
  ): Promise<PaginatedResponse<SaleRecord>> {
    return this.sales.list(query);
  }

  @Post("sales")
  @RequireBusinessRoles(...saleWriteRoles)
  createSale(@Body() input: CreateCounterSaleDto): Promise<SaleRecord> {
    return this.sales.createCounterSale(input);
  }

  @Get("sales/:id")
  @RequireBusinessRoles(...readRoles)
  getSale(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<SaleRecord> {
    return this.sales.get(id);
  }

  @Post("sales/:id/collections")
  @RequireBusinessRoles(...cashWriteRoles)
  collect(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: CreateCollectionDto,
  ): Promise<SaleRecord> {
    return this.sales.collect(id, input);
  }

  @Post("sales/:id/receipt")
  @RequireBusinessRoles(...cashWriteRoles)
  issueReceipt(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<SalesReceiptRecord> {
    return this.sales.issueReceipt(id);
  }

  @Get("sales/:id/receipt")
  @RequireBusinessRoles(...readRoles)
  getReceipt(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<SalesReceiptRecord> {
    return this.sales.getReceipt(id);
  }

  @Get("expenses")
  @RequireBusinessRoles(...cashReadRoles)
  listExpenses(
    @Query() query: ListExpensesQueryDto,
  ): Promise<PaginatedResponse<ExpenseRecord>> {
    return this.expenses.list(query);
  }

  @Post("expenses")
  @RequireBusinessRoles(...cashWriteRoles)
  createExpense(@Body() input: CreateExpenseDto): Promise<ExpenseRecord> {
    return this.expenses.create(input);
  }

  @Get("ledger/entries")
  @RequireBusinessRoles(...cashReadRoles)
  listEntries(
    @Query() query: ListLedgerEntriesQueryDto,
  ): Promise<PaginatedResponse<LedgerEntryRecord>> {
    return this.ledger.listEntries(query);
  }

  @Get("ledger/customers")
  @RequireBusinessRoles(...cashReadRoles)
  listLedgerCustomers(
    @Query() query: ListLedgerCustomersQueryDto,
  ): Promise<LedgerCustomerRecord[]> {
    return this.ledger.listCustomers(query);
  }
}
