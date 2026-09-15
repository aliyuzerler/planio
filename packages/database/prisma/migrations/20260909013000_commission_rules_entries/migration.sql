-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENT', 'AMOUNT');

-- CreateEnum
CREATE TYPE "CommissionSourceType" AS ENUM ('APPOINTMENT');

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "serviceId" UUID,
    "commissionType" "CommissionType" NOT NULL,
    "commissionValue" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionEntry" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "appointmentId" UUID,
    "ruleId" UUID,
    "sourceType" "CommissionSourceType" NOT NULL,
    "sourceId" UUID NOT NULL,
    "staffNameSnapshot" VARCHAR(200) NOT NULL,
    "serviceNameSnapshot" VARCHAR(160) NOT NULL,
    "ruleNameSnapshot" VARCHAR(160) NOT NULL,
    "basisAmount" DECIMAL(12,2) NOT NULL,
    "commissionType" "CommissionType" NOT NULL,
    "commissionValue" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "earnedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommissionRule_businessId_name_key" ON "CommissionRule"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionRule_businessId_id_key" ON "CommissionRule"("businessId", "id");

-- CreateIndex
CREATE INDEX "CommissionRule_businessId_isActive_serviceId_idx" ON "CommissionRule"("businessId", "isActive", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionEntry_businessId_sourceType_sourceId_key" ON "CommissionEntry"("businessId", "sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionEntry_appointmentId_key" ON "CommissionEntry"("appointmentId");

-- CreateIndex
CREATE INDEX "CommissionEntry_businessId_staffId_earnedAt_idx" ON "CommissionEntry"("businessId", "staffId", "earnedAt");

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_businessId_serviceId_fkey" FOREIGN KEY ("businessId", "serviceId") REFERENCES "Service"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_businessId_staffId_fkey" FOREIGN KEY ("businessId", "staffId") REFERENCES "Staff"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CommissionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
