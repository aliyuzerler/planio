-- Database-driven 6-month catalog. Prices stay in Plan rows, not application code.
INSERT INTO "Plan" ("id", "name", "billingPeriod", "price", "currency", "isActive", "limits", "createdAt", "updatedAt")
VALUES
  (
    '85555555-5555-4555-8555-555555555555',
    'Starter',
    'SEMIANNUAL',
    2495.00,
    'TRY',
    true,
    '{"maxStaff": 3, "maxCustomers": 50, "advancedFeatures": false}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '86666666-6666-4666-8666-666666666666',
    'Professional',
    'SEMIANNUAL',
    7495.00,
    'TRY',
    true,
    '{"maxStaff": 15, "maxCustomers": 500, "advancedFeatures": true}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("name", "billingPeriod", "currency") DO NOTHING;
