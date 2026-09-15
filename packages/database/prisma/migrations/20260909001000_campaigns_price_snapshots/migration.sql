-- CreateEnum
CREATE TYPE "CampaignDiscountType" AS ENUM ('PERCENT', 'AMOUNT');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "listPriceSnapshot" DECIMAL(12,2);
ALTER TABLE "Appointment" ADD COLUMN "discountAmountSnapshot" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Appointment" ADD COLUMN "campaignId" UUID;
ALTER TABLE "Appointment" ADD COLUMN "campaignNameSnapshot" VARCHAR(160);

UPDATE "Appointment" SET "listPriceSnapshot" = "servicePriceSnapshot" WHERE "listPriceSnapshot" IS NULL;

ALTER TABLE "Appointment" ALTER COLUMN "listPriceSnapshot" SET NOT NULL;

-- CreateTable
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "discountType" "CampaignDiscountType" NOT NULL,
    "discountValue" DECIMAL(12,2) NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "smsTemplate" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignService" (
    "campaignId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "businessId" UUID NOT NULL,

    CONSTRAINT "CampaignService_pkey" PRIMARY KEY ("campaignId","serviceId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_businessId_name_key" ON "Campaign"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_businessId_id_key" ON "Campaign"("businessId", "id");

-- CreateIndex
CREATE INDEX "Campaign_businessId_isActive_startsAt_endsAt_idx" ON "Campaign"("businessId", "isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "CampaignService_businessId_serviceId_idx" ON "CampaignService"("businessId", "serviceId");

-- CreateIndex
CREATE INDEX "Appointment_campaignId_idx" ON "Appointment"("campaignId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignService" ADD CONSTRAINT "CampaignService_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignService" ADD CONSTRAINT "CampaignService_businessId_serviceId_fkey" FOREIGN KEY ("businessId", "serviceId") REFERENCES "Service"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
