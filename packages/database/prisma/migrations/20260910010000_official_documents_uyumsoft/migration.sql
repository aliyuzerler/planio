-- CreateEnum
CREATE TYPE "OfficialDocumentType" AS ENUM ('E_FATURA', 'SMM');
CREATE TYPE "OfficialDocumentStatus" AS ENUM ('PENDING', 'ISSUED', 'FAILED');
CREATE TYPE "UyumsoftProvider" AS ENUM ('GENERIC', 'UYUMSOFT');

-- AlterTable
ALTER TABLE "Business"
  ADD COLUMN "officialDocumentSequence" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TenantUyumsoftSettings" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "provider" "UyumsoftProvider" NOT NULL DEFAULT 'GENERIC',
    "credentialsCipher" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TenantUyumsoftSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantUyumsoftSettings_businessId_key" ON "TenantUyumsoftSettings"("businessId");

ALTER TABLE "TenantUyumsoftSettings"
  ADD CONSTRAINT "TenantUyumsoftSettings_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "OfficialDocument" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "issuedByUserId" UUID NOT NULL,
    "type" "OfficialDocumentType" NOT NULL,
    "status" "OfficialDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "documentNo" VARCHAR(64),
    "pdfUrl" VARCHAR(500),
    "errorCode" VARCHAR(100),
    "errorMessage" TEXT,
    "cancelPolicy" VARCHAR(400) NOT NULL,
    "issuedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OfficialDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfficialDocument_saleId_key" ON "OfficialDocument"("saleId");
CREATE UNIQUE INDEX "OfficialDocument_businessId_documentNo_key" ON "OfficialDocument"("businessId", "documentNo");
CREATE INDEX "OfficialDocument_businessId_status_createdAt_idx" ON "OfficialDocument"("businessId", "status", "createdAt");

ALTER TABLE "OfficialDocument"
  ADD CONSTRAINT "OfficialDocument_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OfficialDocument"
  ADD CONSTRAINT "OfficialDocument_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OfficialDocument"
  ADD CONSTRAINT "OfficialDocument_businessId_issuedByUserId_fkey"
  FOREIGN KEY ("businessId", "issuedByUserId") REFERENCES "BusinessUser"("businessId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
