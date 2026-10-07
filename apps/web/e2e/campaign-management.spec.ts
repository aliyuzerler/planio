import { expect, test } from "@playwright/test";
import { mockSubscriptionAccess } from "./helpers/subscription-access";

const businessId = "71111111-1111-4111-8111-111111111111";
const campaignId = "72222222-2222-4222-8222-222222222222";
const serviceId = "73333333-3333-4333-8333-333333333333";
const now = "2026-09-05T00:00:00.000Z";

function session(role: "BUSINESS_OWNER" | "STAFF") {
  return {
    accessToken: "campaign-test-token",
    expiresIn: 900,
    tokenType: "Bearer",
    user: {
      id: "74444444-4444-4444-8444-444444444444",
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
  name: "Saç Kesimi",
  description: null,
  durationMinutes: 45,
  price: "250.00",
  currency: "TRY",
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

const campaign = {
  id: campaignId,
  name: "Yaz kesim",
  discountType: "PERCENT",
  discountValue: "20.00",
  startsAt: "2033-06-01T00:00:00.000Z",
  endsAt: "2033-08-31T23:59:00.000Z",
  isActive: true,
  smsTemplate: "Yaz kampanyası başladı.",
  serviceIds: [serviceId],
  createdAt: now,
  updatedAt: now,
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

test("owner creates a campaign and sees the discounted quote", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("BUSINESS_OWNER") }),
  );
  await page.route("**/api/v1/services**", (route) =>
    route.fulfill({ json: [service] }),
  );

  let body: Record<string, unknown> | undefined;
  let created = false;
  await page.route("**/api/v1/campaigns**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith("/quote")) {
      await route.fulfill({
        json: {
          serviceId,
          listPrice: "250.00",
          discountAmount: "50.00",
          payableAmount: "200.00",
          currency: "TRY",
          campaignId,
          campaignName: "Yaz kesim",
        },
      });
      return;
    }
    if (request.method() === "POST") {
      body = request.postDataJSON() as Record<string, unknown>;
      created = true;
      await route.fulfill({ status: 201, json: campaign });
      return;
    }
    if (url.pathname.endsWith(`/${campaignId}`)) {
      await route.fulfill({ json: campaign });
      return;
    }
    await route.fulfill({ json: created ? [campaign] : [] });
  });

  await page.goto("/settings/campaigns");
  await expect(page.getByRole("heading", { name: "Kampanyalar" })).toBeVisible();
  await page.getByRole("link", { name: "Yeni kampanya" }).click();
  await page.getByLabel("Kampanya adı").fill("Yaz kesim");
  await page.getByLabel("İndirim türü").selectOption("PERCENT");
  await page.getByLabel("İndirim değeri").fill("20.00");
  await page.getByLabel("Kampanya başlangıç").fill("2033-06-01T00:00");
  await page.getByLabel("Kampanya bitiş").fill("2033-08-31T23:59");
  await page.getByRole("checkbox", { name: /Saç Kesimi/ }).check();
  await page.getByLabel("SMS şablonu").fill("Yaz kampanyası başladı.");
  const createdResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/api/v1/campaigns"),
  );
  await page.getByRole("button", { name: "Kampanya oluştur" }).click();
  const response = await createdResponse;
  expect(response.status()).toBe(201);
  await expect(page).toHaveURL(new RegExp(`/settings/campaigns/${campaignId}$`), {
    timeout: 15_000,
  });
  expect(body).toMatchObject({
    name: "Yaz kesim",
    discountType: "PERCENT",
    discountValue: "20.00",
    serviceIds: [serviceId],
  });
  expect(body).not.toHaveProperty("businessId");

  await page.route("**/api/v1/staff**", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/v1/resources**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/v1/customers**", (route) =>
    route.fulfill({
      json: {
        items: [],
        page: 1,
        pageSize: 100,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    }),
  );
  await page.goto("/settings/appointments/new");
  await page.getByLabel("Hizmet").selectOption(serviceId);
  await page.getByLabel("Başlangıç").fill("2033-06-15T10:00");
  await expect(page.getByText(/Ödenecek ₺200,00/)).toBeVisible();
});

test("staff does not see campaign management in navigation", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("STAFF") }),
  );
  await page.route("**/api/v1/services**", (route) =>
    route.fulfill({ json: [service] }),
  );
  await page.goto("/settings/services");
  await expect(page.getByRole("heading", { name: "Hizmetler" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kampanyalar" })).toHaveCount(0);
});
