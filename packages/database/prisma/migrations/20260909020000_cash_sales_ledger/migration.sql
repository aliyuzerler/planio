-- AlterTable
ALTER TABLE "Business" ADD COLUMN "receiptSequence" INTEGER NOT NULL DEFAULT 0;

-- CreateEnum
CREATE TYPE "CashAccountType" AS ENUM ('CASH', 'BANK');
CREATE TYPE "SaleSource" AS ENUM ('APPOINTMENT', 'COUNTER');
CREATE TYPE "SaleStatus" AS ENUM ('OPEN', 'SETTLED');
CREATE TYPE "CollectionMethod" AS ENUM ('CASH');
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'UTILITY', 'MATERIAL', 'SALARY', 'COMMISSION', 'OTHER');
CREATE TYPE "LedgerEntryType" AS ENUM ('SALE', 'COLLECTION');

-- CreateTable
CREATE TABLE "CashAccount" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "CashAccountType" NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CashAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Sale" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "appointmentId" UUID,
    "staffId" UUID,
    "createdByUserId" UUID NOT NULL,
    "source" "SaleSource" NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'OPEN',
    "currency" CHAR(3) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "collectedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "listPriceSnapshot" DECIMAL(12,2) NOT NULL,
    "discountAmountSnapshot" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "campaignId" UUID,
    "campaignNameSnapshot" VARCHAR(160),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SaleLine" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "serviceId" UUID,
    "nameSnapshot" VARCHAR(160) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "listPriceSnapshot" DECIMAL(12,2) NOT NULL,
    "discountAmountSnapshot" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "SaleLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Collection" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "cashAccountId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "collectedByUserId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "CollectionMethod" NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "collectedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerLedgerEntry" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "saleId" UUID,
    "collectionId" UUID,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "description" VARCHAR(240) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cashAccountId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "staffId" UUID,
    "commissionEntryId" UUID,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "notes" TEXT,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesReceipt" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "issuedByUserId" UUID NOT NULL,
    "receiptNo" VARCHAR(32) NOT NULL,
    "sequence" INTEGER NOT NULL,
    "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashAccount_businessId_name_key" ON "CashAccount"("businessId", "name");
CREATE UNIQUE INDEX "CashAccount_businessId_id_key" ON "CashAccount"("businessId", "id");
CREATE INDEX "CashAccount_businessId_isActive_idx" ON "CashAccount"("businessId", "isActive");

CREATE UNIQUE INDEX "Sale_appointmentId_key" ON "Sale"("appointmentId");
CREATE UNIQUE INDEX "Sale_businessId_id_key" ON "Sale"("businessId", "id");
CREATE INDEX "Sale_businessId_createdAt_idx" ON "Sale"("businessId", "createdAt");
CREATE INDEX "Sale_businessId_customerId_createdAt_idx" ON "Sale"("businessId", "customerId", "createdAt");
CREATE INDEX "Sale_businessId_staffId_createdAt_idx" ON "Sale"("businessId", "staffId", "createdAt");
CREATE INDEX "Sale_businessId_status_idx" ON "Sale"("businessId", "status");
CREATE INDEX "Sale_campaignId_idx" ON "Sale"("campaignId");

CREATE INDEX "SaleLine_businessId_saleId_idx" ON "SaleLine"("businessId", "saleId");

CREATE INDEX "Collection_businessId_collectedAt_idx" ON "Collection"("businessId", "collectedAt");
CREATE INDEX "Collection_businessId_saleId_idx" ON "Collection"("businessId", "saleId");
CREATE INDEX "Collection_businessId_cashAccountId_collectedAt_idx" ON "Collection"("businessId", "cashAccountId", "collectedAt");

CREATE INDEX "CustomerLedgerEntry_businessId_customerId_occurredAt_idx" ON "CustomerLedgerEntry"("businessId", "customerId", "occurredAt");
CREATE INDEX "CustomerLedgerEntry_businessId_occurredAt_idx" ON "CustomerLedgerEntry"("businessId", "occurredAt");

CREATE UNIQUE INDEX "Expense_commissionEntryId_key" ON "Expense"("commissionEntryId");
CREATE INDEX "Expense_businessId_occurredAt_idx" ON "Expense"("businessId", "occurredAt");
CREATE INDEX "Expense_businessId_category_occurredAt_idx" ON "Expense"("businessId", "category", "occurredAt");

CREATE UNIQUE INDEX "SalesReceipt_saleId_key" ON "SalesReceipt"("saleId");
CREATE UNIQUE INDEX "SalesReceipt_businessId_receiptNo_key" ON "SalesReceipt"("businessId", "receiptNo");
CREATE UNIQUE INDEX "SalesReceipt_businessId_sequence_key" ON "SalesReceipt"("businessId", "sequence");
CREATE INDEX "SalesReceipt_businessId_issuedAt_idx" ON "SalesReceipt"("businessId", "issuedAt");

-- AddForeignKey
ALTER TABLE "CashAccount" ADD CONSTRAINT "CashAccount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Sale" ADD CONSTRAINT "Sale_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_businessId_customerId_fkey" FOREIGN KEY ("businessId", "customerId") REFERENCES "Customer"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_businessId_staffId_fkey" FOREIGN KEY ("businessId", "staffId") REFERENCES "Staff"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_businessId_createdByUserId_fkey" FOREIGN KEY ("businessId", "createdByUserId") REFERENCES "BusinessUser"("businessId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_businessId_serviceId_fkey" FOREIGN KEY ("businessId", "serviceId") REFERENCES "Service"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Collection" ADD CONSTRAINT "Collection_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_businessId_cashAccountId_fkey" FOREIGN KEY ("businessId", "cashAccountId") REFERENCES "CashAccount"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_businessId_customerId_fkey" FOREIGN KEY ("businessId", "customerId") REFERENCES "Customer"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_businessId_collectedByUserId_fkey" FOREIGN KEY ("businessId", "collectedByUserId") REFERENCES "BusinessUser"("businessId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_businessId_customerId_fkey" FOREIGN KEY ("businessId", "customerId") REFERENCES "Customer"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_businessId_cashAccountId_fkey" FOREIGN KEY ("businessId", "cashAccountId") REFERENCES "CashAccount"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_businessId_createdByUserId_fkey" FOREIGN KEY ("businessId", "createdByUserId") REFERENCES "BusinessUser"("businessId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_businessId_staffId_fkey" FOREIGN KEY ("businessId", "staffId") REFERENCES "Staff"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_commissionEntryId_fkey" FOREIGN KEY ("commissionEntryId") REFERENCES "CommissionEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SalesReceipt" ADD CONSTRAINT "SalesReceipt_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReceipt" ADD CONSTRAINT "SalesReceipt_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReceipt" ADD CONSTRAINT "SalesReceipt_businessId_issuedByUserId_fkey" FOREIGN KEY ("businessId", "issuedByUserId") REFERENCES "BusinessUser"("businessId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
