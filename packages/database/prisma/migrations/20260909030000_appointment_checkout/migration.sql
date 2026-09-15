-- AlterEnum
ALTER TYPE "CollectionMethod" ADD VALUE 'CARD';
ALTER TYPE "CollectionMethod" ADD VALUE 'LINK';

-- CreateEnum
CREATE TYPE "AppointmentPaymentPlan" AS ENUM ('DEPOSIT', 'FULL', 'ON_DAY');
CREATE TYPE "AppointmentPaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');
CREATE TYPE "TenantPosProvider" AS ENUM ('GENERIC', 'IYZICO');
CREATE TYPE "CheckoutPurpose" AS ENUM ('DEPOSIT', 'FULL', 'REMAINING');
CREATE TYPE "CheckoutIntentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Appointment"
  ADD COLUMN "paymentPlan" "AppointmentPaymentPlan" NOT NULL DEFAULT 'ON_DAY',
  ADD COLUMN "depositAmount" DECIMAL(12,2),
  ADD COLUMN "paymentStatus" "AppointmentPaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- CreateTable
CREATE TABLE "TenantPaymentSettings" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "provider" "TenantPosProvider" NOT NULL DEFAULT 'GENERIC',
    "credentialsCipher" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TenantPaymentSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantPaymentSettings_businessId_key" ON "TenantPaymentSettings"("businessId");

ALTER TABLE "TenantPaymentSettings"
  ADD CONSTRAINT "TenantPaymentSettings_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CheckoutIntent" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "purpose" "CheckoutPurpose" NOT NULL,
    "status" "CheckoutIntentStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "paidAt" TIMESTAMPTZ(3),
    "collectionId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CheckoutIntent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CheckoutIntent_token_key" ON "CheckoutIntent"("token");
CREATE UNIQUE INDEX "CheckoutIntent_collectionId_key" ON "CheckoutIntent"("collectionId");
CREATE INDEX "CheckoutIntent_businessId_appointmentId_status_idx" ON "CheckoutIntent"("businessId", "appointmentId", "status");
CREATE INDEX "CheckoutIntent_businessId_createdAt_idx" ON "CheckoutIntent"("businessId", "createdAt");

ALTER TABLE "CheckoutIntent"
  ADD CONSTRAINT "CheckoutIntent_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CheckoutIntent"
  ADD CONSTRAINT "CheckoutIntent_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CheckoutIntent"
  ADD CONSTRAINT "CheckoutIntent_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CheckoutIntent"
  ADD CONSTRAINT "CheckoutIntent_businessId_customerId_fkey"
  FOREIGN KEY ("businessId", "customerId") REFERENCES "Customer"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CheckoutIntent"
  ADD CONSTRAINT "CheckoutIntent_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
