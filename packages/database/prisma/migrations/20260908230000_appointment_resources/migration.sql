-- CreateTable
CREATE TABLE "Resource" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Resource_businessId_name_key" ON "Resource"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_businessId_id_key" ON "Resource"("businessId", "id");

-- CreateIndex
CREATE INDEX "Resource_businessId_isActive_idx" ON "Resource"("businessId", "isActive");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "resourceId" UUID;

-- CreateIndex
CREATE INDEX "Appointment_businessId_resourceId_startAt_idx" ON "Appointment"("businessId", "resourceId", "startAt");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Half-open ranges [startAt, endAt) allow back-to-back bookings.
-- Only CONFIRMED appointments with a resource occupy that resource.
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_resource_no_overlap"
  EXCLUDE USING gist (
    "businessId" WITH =,
    "resourceId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" = 'CONFIRMED' AND "resourceId" IS NOT NULL);
