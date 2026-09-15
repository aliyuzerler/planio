ALTER TABLE "Plan" ADD COLUMN "externalPricingPlanCode" VARCHAR(191);

CREATE INDEX "Payment_externalReference_idx" ON "Payment"("externalReference");
