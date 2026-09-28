import type { Page } from "@playwright/test";

/** Active subscription access so AppShell does not treat the tenant as locked. */
export async function mockSubscriptionAccess(page: Page) {
  await page.route("**/api/v1/subscriptions/access", (route) =>
    route.fulfill({
      json: {
        hasAccess: true,
        status: "ACTIVE",
        plan: {
          id: "81111111-1111-4111-8111-111111111111",
          name: "Starter",
          billingPeriod: "MONTHLY",
          price: "499.00",
          currency: "TRY",
          isActive: true,
          limits: { maxStaff: 50, maxCustomers: 500, advancedFeatures: true },
        },
        limits: { maxStaff: 50, maxCustomers: 500, advancedFeatures: true },
        usage: { staff: 1, customers: 1 },
      },
    }),
  );
}
