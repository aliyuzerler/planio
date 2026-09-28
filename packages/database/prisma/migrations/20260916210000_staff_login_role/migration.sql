-- CreateEnum
CREATE TYPE "StaffLoginRole" AS ENUM ('STAFF', 'ACCOUNTANT');

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN "loginRole" "StaffLoginRole" NOT NULL DEFAULT 'STAFF';

-- CreateIndex
CREATE INDEX "Staff_businessId_loginRole_isActive_idx" ON "Staff"("businessId", "loginRole", "isActive");
