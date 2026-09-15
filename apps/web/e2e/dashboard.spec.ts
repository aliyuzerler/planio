import { expect, test } from "@playwright/test";

const businessId = "a1111111-1111-4111-8111-111111111111";
const now = "2026-09-05T00:00:00.000Z";

function session() {
  return {
    accessToken: "dashboard-test-token",
    expiresIn: 900,
    tokenType: "Bearer",
    user: {
      id: "a2222222-2222-4222-8222-222222222222",
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
        role: "BUSINESS_OWNER",
        isActive: true,
      },
    ],
  };
}

function pageOf(items: unknown[], total = items.length) {
  return {
    items,
    page: 1,
    pageSize: 100,
    total,
    totalPages: 1,
    hasMore: false,
  };
}

const appointment = {
  id: "a3333333-3333-4333-8333-333333333333",
  customer: { id: "a4444444-4444-4444-8444-444444444444", firstName: "Ada", lastName: "Lovelace" },
  staff: { id: "a5555555-5555-4555-8555-555555555555", firstName: "Stylist", lastName: "One" },
  service: { id: "a6666666-6666-4666-8666-666666666666", name: "Hair Cut" },
  startAt: "2033-01-15T10:00:00.000Z",
  endAt: "2033-01-15T11:00:00.000Z",
  status: "CONFIRMED",
  notes: null,
  createdByUserId: "a2222222-2222-4222-8222-222222222222",
  serviceNameSnapshot: "Hair Cut",
  serviceDurationSnapshot: 60,
  servicePriceSnapshot: "250.00",
  listPriceSnapshot: "250.00",
  discountAmountSnapshot: "0.00",
  campaignId: null,
  campaignNameSnapshot: null,
  currency: "TRY",
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

test("dashboard shows operational counts from existing list APIs", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session() }),
  );
  await page.route("**/api/v1/business", (route) =>
    route.fulfill({
      json: {
        id: businessId,
        name: "Xenior Beauty",
        phone: null,
        email: "owner@example.test",
        address: null,
        timezone: "Europe/Istanbul",
        currency: "TRY",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    }),
  );
  await page.route("**/api/v1/appointments**", (route) => {
    const url = new URL(route.request().url());
    const status = url.searchParams.get("status");
    if (status === "COMPLETED") {
      return route.fulfill({ json: pageOf([], 4) });
    }
    if (status === "CANCELLED") {
      return route.fulfill({ json: pageOf([], 1) });
    }
    if (status === "CONFIRMED") {
      return route.fulfill({ json: pageOf([appointment, { ...appointment, id: "a7777777-7777-4777-8777-777777777777" }]) });
    }
    return route.fulfill({ json: pageOf([appointment], 3) });
  });
  await page.route("**/api/v1/customers**", (route) =>
    route.fulfill({ json: { ...pageOf([], 12), pageSize: 1 } }),
  );
  await page.route("**/api/v1/staff**", (route) =>
    route.fulfill({
      json: [
        {
          id: "a5555555-5555-4555-8555-555555555555",
          firstName: "Stylist",
          lastName: "One",
          phone: null,
          email: null,
          notes: null,
          isActive: true,
          specializations: [],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "a8888888-8888-4888-8888-888888888888",
          firstName: "Stylist",
          lastName: "Two",
          phone: null,
          email: null,
          notes: null,
          isActive: true,
          specializations: [],
          createdAt: now,
          updatedAt: now,
        },
      ],
    }),
  );

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Gösterge paneli" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Uygulama menüsü" })).toBeVisible();
  const summary = page.getByLabel("Operasyon özeti");
  await expect(summary.getByText("Bugünkü randevular")).toBeVisible();
  await expect(summary.getByText("Yaklaşan randevular")).toBeVisible();
  await expect(summary.getByText("Tamamlanan randevular")).toBeVisible();
  await expect(summary.getByText("İptal edilen randevular")).toBeVisible();
  await expect(summary.getByText("Müşteri sayısı")).toBeVisible();
  await expect(summary.getByText("Personel sayısı")).toBeVisible();
  await expect(
    summary.getByRole("article").filter({ hasText: "Bugünkü randevular" }),
  ).toContainText("3");
  await expect(
    summary.getByRole("article").filter({ hasText: "Yaklaşan randevular" }),
  ).toContainText("2");
  await expect(
    summary.getByRole("article").filter({ hasText: "Tamamlanan randevular" }),
  ).toContainText("4");
  await expect(
    summary.getByRole("article").filter({ hasText: "İptal edilen randevular" }),
  ).toContainText("1");
  await expect(
    summary.getByRole("article").filter({ hasText: "Müşteri sayısı" }),
  ).toContainText("12");
  await expect(
    summary.getByRole("article").filter({ hasText: "Personel sayısı" }),
  ).toContainText("2");
  await expect(page.getByRole("heading", { name: "Yaklaşan randevular" })).toBeVisible();
  await expect(page.getByText("Ada Lovelace").first()).toBeVisible();
});
