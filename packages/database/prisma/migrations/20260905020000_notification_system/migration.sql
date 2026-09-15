-- CreateEnum
CREATE TYPE "PushPlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- AlterTable
ALTER TABLE "Notification"
  ADD COLUMN "appointmentId" UUID,
  ADD COLUMN "provider" VARCHAR(40),
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastAttemptAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "NotificationSettings" (
    "businessId" UUID NOT NULL,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnCreated" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnRescheduled" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnCancelled" BOOLEAN NOT NULL DEFAULT true,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderMinutesBefore" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("businessId")
);

ALTER TABLE "NotificationSettings"
  ADD CONSTRAINT "NotificationSettings_reminder_minutes_check"
    CHECK ("reminderMinutesBefore" >= 15 AND "reminderMinutesBefore" <= 10080);

-- CreateTable
CREATE TABLE "PushDevice" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" VARCHAR(512) NOT NULL,
    "platform" "PushPlatform" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NotificationSettings"
  ADD CONSTRAINT "NotificationSettings_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PushDevice"
  ADD CONSTRAINT "PushDevice_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PushDevice"
  ADD CONSTRAINT "PushDevice_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_businessId_appointmentId_fkey"
  FOREIGN KEY ("businessId", "appointmentId") REFERENCES "Appointment"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "PushDevice_businessId_token_key" ON "PushDevice"("businessId", "token");
CREATE UNIQUE INDEX "PushDevice_businessId_id_key" ON "PushDevice"("businessId", "id");
CREATE INDEX "PushDevice_businessId_userId_isActive_idx" ON "PushDevice"("businessId", "userId", "isActive");
CREATE INDEX "Notification_businessId_appointmentId_type_status_idx" ON "Notification"("businessId", "appointmentId", "type", "status");
