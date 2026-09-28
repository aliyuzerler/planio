import { expect, test } from "@playwright/test";
import { mockSubscriptionAccess } from "./helpers/subscription-access";

const businessId = "11111111-1111-4111-8111-111111111111";
const now = "2026-09-05T00:00:00.000Z";

function session(role: "BUSINESS_OWNER" | "STAFF") {
  return {
    accessToken: "test-access-token",
    expiresIn: 900,
    tokenType: "Bearer",
    user: {
      id: "22222222-2222-4222-8222-222222222222",
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

const profile = {
  id: businessId,
  name: "Xenior Beauty",
  phone: "+905551112233",
  email: "info@xenior.test",
  address: "Istanbul",
  timezone: "Europe/Istanbul",
  currency: "TRY",
  status: "ACTIVE",
  createdAt: now,
  updatedAt: now,
};

const hours = {
  hoursEnforced: false,
  days: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    startMinutes: 540,
    endMinutes: 1140,
    isClosed: weekday === 0,
  })),
};

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([
    {
      name: "xenior.refresh",
      value: "test-refresh-cookie",
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await mockSubscriptionAccess(page);
});

test("owner updates the selected business without sending businessId", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("BUSINESS_OWNER") }),
  );

  let patchBody: Record<string, unknown> | undefined;
  let tenantHeader: string | undefined;
  await page.route("**/api/v1/business/hours", (route) =>
    route.fulfill({ json: hours }),
  );
  await page.route("**/api/v1/business", async (route) => {
    if (route.request().method() === "PATCH") {
      patchBody = route.request().postDataJSON() as Record<string, unknown>;
      tenantHeader = await route.request().headerValue("X-Business-Id") ?? undefined;
      await route.fulfill({
        json: { ...profile, ...patchBody, updatedAt: "2026-09-05T00:01:00.000Z" },
      });
      return;
    }
    await route.fulfill({ json: profile });
  });

  await page.goto("/settings/business");
  await expect(
    page.getByRole("heading", { name: "İşletme" }),
  ).toBeVisible();
  await page.getByLabel("İşletme adı").fill("Yeni İşletme Adı");
  await page.getByRole("button", { name: "Değişiklikleri kaydet" }).click();

  await expect(
    page.getByText("İşletme bilgileri kaydedildi.").first(),
  ).toBeVisible();
  expect(tenantHeader).toBe(businessId);
  expect(patchBody?.name).toBe("Yeni İşletme Adı");
  expect(patchBody).not.toHaveProperty("businessId");
});

test("staff sees business settings as read-only", async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("STAFF") }),
  );
  await page.route("**/api/v1/business/hours", (route) =>
    route.fulfill({ json: hours }),
  );
  await page.route("**/api/v1/business", (route) =>
    route.fulfill({ json: profile }),
  );

  await page.goto("/settings/business");
  await expect(
    page.getByText(
      "STAFF rolü işletme profilini görüntüleyebilir ancak değiştiremez.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("İşletme adı")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Değişiklikleri kaydet" }),
  ).toHaveCount(0);
});
