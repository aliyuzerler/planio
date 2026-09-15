ALTER TYPE "NotificationChannel" ADD VALUE 'EMAIL';

CREATE TYPE "AuthTokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'STAFF_INVITE');
CREATE TYPE "DataRequestType" AS ENUM ('EXPORT', 'ERASE');
CREATE TYPE "DataRequestStatus" AS ENUM ('PENDING', 'COMPLETED');

ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMPTZ(3);

ALTER TABLE "Business"
  ADD COLUMN "hoursEnforced" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "privacyPolicyAcceptedAt" TIMESTAMPTZ(3);

ALTER TABLE "Customer"
  ADD COLUMN "smsConsent" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "whatsappConsent" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "emailConsent" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "NotificationSettings"
  ADD COLUMN "emailEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "NotificationChannelConfig" (
  "id" UUID NOT NULL,
  "businessId" UUID NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "provider" VARCHAR(40) NOT NULL,
  "credentialsCipher" TEXT NOT NULL,
  "extra" JSONB,
  "lastTestedAt" TIMESTAMPTZ(3),
  "lastTestError" VARCHAR(500),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "NotificationChannelConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationChannelConfig_businessId_channel_key" ON "NotificationChannelConfig"("businessId", "channel");
CREATE INDEX "NotificationChannelConfig_businessId_idx" ON "NotificationChannelConfig"("businessId");

ALTER TABLE "NotificationChannelConfig"
  ADD CONSTRAINT "NotificationChannelConfig_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BusinessHours" (
  "id" UUID NOT NULL,
  "businessId" UUID NOT NULL,
  "weekday" INTEGER NOT NULL,
  "startMinutes" INTEGER NOT NULL DEFAULT 540,
  "endMinutes" INTEGER NOT NULL DEFAULT 1140,
  "isClosed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BusinessHours_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessHours_businessId_weekday_key" ON "BusinessHours"("businessId", "weekday");

ALTER TABLE "BusinessHours"
  ADD CONSTRAINT "BusinessHours_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StaffHours" (
  "id" UUID NOT NULL,
  "businessId" UUID NOT NULL,
  "staffId" UUID NOT NULL,
  "weekday" INTEGER NOT NULL,
  "startMinutes" INTEGER NOT NULL DEFAULT 540,
  "endMinutes" INTEGER NOT NULL DEFAULT 1140,
  "isClosed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "StaffHours_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffHours_staffId_weekday_key" ON "StaffHours"("staffId", "weekday");
CREATE INDEX "StaffHours_businessId_staffId_idx" ON "StaffHours"("businessId", "staffId");

ALTER TABLE "StaffHours"
  ADD CONSTRAINT "StaffHours_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StaffHours"
  ADD CONSTRAINT "StaffHours_businessId_staffId_fkey"
  FOREIGN KEY ("businessId", "staffId") REFERENCES "Staff"("businessId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AuthToken" (
  "id" UUID NOT NULL,
  "purpose" "AuthTokenPurpose" NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "userId" UUID,
  "businessId" UUID,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "consumedAt" TIMESTAMPTZ(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");
CREATE INDEX "AuthToken_purpose_email_idx" ON "AuthToken"("purpose", "email");
CREATE INDEX "AuthToken_expiresAt_idx" ON "AuthToken"("expiresAt");

ALTER TABLE "AuthToken"
  ADD CONSTRAINT "AuthToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuthToken"
  ADD CONSTRAINT "AuthToken_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PrivacyConsent" (
  "id" UUID NOT NULL,
  "businessId" UUID,
  "userId" UUID,
  "customerId" UUID,
  "kind" VARCHAR(64) NOT NULL,
  "acceptedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" VARCHAR(64) NOT NULL,
  CONSTRAINT "PrivacyConsent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrivacyConsent_businessId_kind_idx" ON "PrivacyConsent"("businessId", "kind");
CREATE INDEX "PrivacyConsent_userId_kind_idx" ON "PrivacyConsent"("userId", "kind");

ALTER TABLE "PrivacyConsent"
  ADD CONSTRAINT "PrivacyConsent_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PrivacyConsent"
  ADD CONSTRAINT "PrivacyConsent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DataRequest" (
  "id" UUID NOT NULL,
  "businessId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "type" "DataRequestType" NOT NULL,
  "status" "DataRequestStatus" NOT NULL DEFAULT 'PENDING',
  "payload" JSONB,
  "completedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "DataRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DataRequest_businessId_type_status_idx" ON "DataRequest"("businessId", "type", "status");

ALTER TABLE "DataRequest"
  ADD CONSTRAINT "DataRequest_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DataRequest"
  ADD CONSTRAINT "DataRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
