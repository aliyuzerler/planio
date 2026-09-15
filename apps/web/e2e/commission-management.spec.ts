import { expect, test } from "@playwright/test";

const businessId = "81111111-1111-4111-8111-111111111111";
const ruleId = "82222222-2222-4222-8222-222222222222";
const serviceId = "83333333-3333-4333-8333-333333333333";
const now = "2026-09-05T00:00:00.000Z";

function session(role: "BUSINESS_OWNER" | "STAFF") {
  return {
    accessToken: "commission-test-token",
    expiresIn: 900,
    tokenType: "Bearer",
    user: {
      id: "84444444-4444-4444-8444-444444444444",
      email: "owner@example.test",
      firstName: "Test",
      lastName: "Owner",
      platformRole: "USER",
    },
    memberships: [
      {
        businessId,
        businessName: "Xenior Beauty",
        businessStatus: "ACTIVE",
        role,
        isActive: true,
      },
    ],
  };
}

const service = {
  id: serviceId,
  name: "Klasik Manikür",
  description: null,
  durationMinutes: 45,
  price: "450.00",
  currency: "TRY",
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

const rule = {
  id: ruleId,
  name: "Manikür %20",
  serviceId,
  commissionType: "PERCENT",
  commissionValue: "20.00",
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    {
      name: "xenior.refresh",
      value: "test-refresh-cookie",
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
});

test("owner creates a commission rule", async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("BUSINESS_OWNER") }),
  );
  await page.route("**/api/v1/services**", (route) =>
    route.fulfill({ json: [service] }),
  );
  let body: Record<string, unknown> | undefined;
  let created = false;
  await page.route("**/api/v1/commissions/rules**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "POST") {
      body = request.postDataJSON() as Record<string, unknown>;
      created = true;
      await route.fulfill({ status: 201, json: rule });
      return;
    }
    if (url.pathname.endsWith(`/${ruleId}`)) {
      await route.fulfill({ json: rule });
      return;
    }
    await route.fulfill({ json: created ? [rule] : [] });
  });

  await page.goto("/settings/commissions");
  await expect(page.getByRole("heading", { name: "Prim kuralları" })).toBeVisible();
  await page.getByRole("link", { name: "Yeni kural" }).click();
  await page.getByLabel("Kural adı").fill("Manikür %20");
  await page.getByLabel("Prim türü").selectOption("PERCENT");
  await page.getByLabel("Prim değeri").fill("20");
  await page.getByLabel("Hedef hizmet").selectOption(serviceId);
  await page.getByRole("button", { name: "Kural oluştur" }).click();
  await expect(page).toHaveURL(new RegExp(`/settings/commissions/${ruleId}$`));
  expect(body).toMatchObject({
    name: "Manikür %20",
    commissionType: "PERCENT",
    commissionValue: "20.00",
    serviceId,
  });
});

test("staff does not see commission rule management", async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("STAFF") }),
  );
  await page.route("**/api/v1/services**", (route) =>
    route.fulfill({ json: [service] }),
  );
  await page.goto("/settings/services");
  await expect(page.getByRole("heading", { name: "Hizmetler" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Prim kuralları" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Hakediş" })).toBeVisible();
});
