-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "limits" JSONB;

ALTER TABLE "Subscription"
  ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

-- Database-driven catalog. Application code must read these rows, not hard-code prices.
INSERT INTO "Plan" ("id", "name", "billingPeriod", "price", "currency", "isActive", "limits", "createdAt", "updatedAt")
VALUES
  (
    '81111111-1111-4111-8111-111111111111',
    'Starter',
    'MONTHLY',
    499.00,
    'TRY',
    true,
    '{"maxStaff": 3, "maxCustomers": 50, "advancedFeatures": false}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '82222222-2222-4222-8222-222222222222',
    'Starter',
    'YEARLY',
    4990.00,
    'TRY',
    true,
    '{"maxStaff": 3, "maxCustomers": 50, "advancedFeatures": false}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '83333333-3333-4333-8333-333333333333',
    'Professional',
    'MONTHLY',
    1499.00,
    'TRY',
    true,
    '{"maxStaff": 15, "maxCustomers": 500, "advancedFeatures": true}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '84444444-4444-4444-8444-444444444444',
    'Professional',
    'YEARLY',
    14990.00,
    'TRY',
    true,
    '{"maxStaff": 15, "maxCustomers": 500, "advancedFeatures": true}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("name", "billingPeriod", "currency") DO NOTHING;
