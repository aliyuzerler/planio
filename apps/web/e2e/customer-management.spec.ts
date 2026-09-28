import { expect, test } from "@playwright/test";
import { mockSubscriptionAccess } from "./helpers/subscription-access";

const businessId = "51111111-1111-4111-8111-111111111111";
const customerId = "52222222-2222-4222-8222-222222222222";
const now = "2026-09-05T00:00:00.000Z";

function session(role: "BUSINESS_OWNER" | "STAFF") {
  return {
    accessToken: "customer-test-token",
    expiresIn: 900,
    tokenType: "Bearer",
    user: {
      id: "53333333-3333-4333-8333-333333333333",
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

const customer = {
  id: customerId,
  firstName: "Ada",
  lastName: "Lovelace",
  phone: "+905551112233",
  email: "ada@example.test",
  birthDate: "1990-05-15",
  notes: "Regular client",
  smsConsent: true,
  whatsappConsent: true,
  emailConsent: true,
  ledgerBalance: "0.00",
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

function pageOf(items: typeof customer[]) {
  return {
    items,
    page: 1,
    pageSize: 25,
    total: items.length,
    totalPages: items.length > 0 ? 1 : 0,
    hasMore: false,
  };
}

const emptyLedgerPage = {
  items: [],
  page: 1,
  pageSize: 50,
  total: 0,
  totalPages: 0,
  hasMore: false,
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
  // Owner detail pages fetch ledger; an unmocked 401 from a live API logs the suite out.
  await page.route("**/api/v1/ledger/entries**", (route) =>
    route.fulfill({ json: emptyLedgerPage }),
  );
});

test("owner lists, searches and creates a tenant-scoped customer", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("BUSINESS_OWNER") }),
  );

  let createBody: Record<string, unknown> | undefined;
  let tenantHeader: string | null = null;
  let lastListUrl = "";
  await page.route("**/api/v1/customers**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "POST") {
      createBody = request.postDataJSON() as Record<string, unknown>;
      tenantHeader = await request.headerValue("X-Business-Id");
      await route.fulfill({
        status: 201,
        json: { ...customer, ...createBody },
      });
      return;
    }
    if (url.pathname.includes("/files")) {
      await route.fulfill({ json: [] });
      return;
    }
    if (url.pathname.endsWith(`/${customerId}/appointments`)) {
      await route.fulfill({ json: pageOf([]) });
      return;
    }
    if (url.pathname.endsWith(`/${customerId}`)) {
      await route.fulfill({ json: customer });
      return;
    }
    lastListUrl = request.url();
    const q = url.searchParams.get("q") ?? "";
    await route.fulfill({
      json: pageOf(q && !customer.firstName.includes(q) ? [] : [customer]),
    });
  });

  await page.goto("/settings/customers");
  await expect(page.getByRole("heading", { name: "Müşteriler" })).toBeVisible();
  await expect(page.getByText("Ada Lovelace")).toBeVisible();
  await page.getByLabel("Müşteri ara").fill("Ada");
  await expect.poll(() => lastListUrl).toContain("q=Ada");
  expect(lastListUrl).toContain("page=1");
  expect(lastListUrl).toContain("pageSize=25");

  await page.getByRole("link", { name: "Yeni müşteri" }).click();
  await page.getByLabel("Ad", { exact: true }).fill("Grace");
  await page.getByLabel("Soyad", { exact: true }).fill("Hopper");
  const created = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/api\/v1\/customers\/?$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole("button", { name: "Müşteri oluştur" }).click();
  await created;

  await expect(page).toHaveURL(
    new RegExp(`/settings/customers/${customerId}$`),
    { timeout: 15_000 },
  );
  expect(tenantHeader).toBe(businessId);
  expect(createBody).toMatchObject({
    firstName: "Grace",
    lastName: "Hopper",
  });
  expect(createBody).not.toHaveProperty("businessId");
});

test("staff role receives read-only customer details and empty history", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("STAFF") }),
  );
  await page.route(`**/api/v1/customers/${customerId}/files**`, (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route(`**/api/v1/customers/${customerId}/appointments**`, (route) =>
    route.fulfill({ json: pageOf([]) }),
  );
  await page.route(`**/api/v1/customers/${customerId}`, (route) =>
    route.fulfill({ json: customer }),
  );

  await page.goto(`/settings/customers/${customerId}`);
  await expect(
    page.getByText(
      "Personel rolü müşteri bilgilerini görüntüleyebilir ancak değiştiremez.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Bu müşteri için henüz randevu kaydı yok."),
  ).toBeVisible();
  await expect(page.getByText("Cari: 0,00 TRY")).toBeVisible();
  await expect(page.getByRole("button", { name: "Yükle" })).toHaveCount(0);
  await expect(
    page.getByText("Bu müşteri için henüz belge yok."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Düzenle" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pasifleştir" })).toHaveCount(0);
});

test("owner deactivates a customer and sees real appointment history", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("BUSINESS_OWNER") }),
  );
  let active = true;
  await page.route(`**/api/v1/customers/${customerId}/files**`, (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route(`**/api/v1/customers/${customerId}/appointments**`, (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: "54444444-4444-4444-8444-444444444444",
            startAt: "2032-01-01T09:00:00.000Z",
            endAt: "2032-01-01T09:45:00.000Z",
            status: "CONFIRMED",
            serviceNameSnapshot: "Hair Cut",
            serviceDurationSnapshot: 45,
            servicePriceSnapshot: "250.00",
            currency: "TRY",
            staff: {
              id: "55555555-5555-4555-8555-555555555555",
              firstName: "Stylist",
              lastName: "One",
            },
          },
        ],
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
        hasMore: false,
      },
    }),
  );
  await page.route(`**/api/v1/customers/${customerId}`, async (route) => {
    if (route.request().method() === "PATCH") {
      active = false;
      await route.fulfill({ json: { ...customer, isActive: active } });
      return;
    }
    await route.fulfill({ json: { ...customer, isActive: active } });
  });

  await page.goto(`/settings/customers/${customerId}`);
  await expect(page.getByText("Hair Cut")).toBeVisible();
  await expect(page.getByText(/Stylist One/)).toBeVisible();
  await page.getByRole("button", { name: "Pasifleştir" }).click();
  await page.getByRole("button", { name: "Onayla" }).click();
  await expect(page.getByText("Değişiklik kaydedildi.").first()).toBeVisible();
  await expect(page.getByText("Pasif müşteri")).toBeVisible();
  await expect(page.getByRole("button", { name: "Aktifleştir" })).toBeVisible();
});

test("owner sees cari balance and can upload a KVKK file", async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("BUSINESS_OWNER") }),
  );
  const files: Array<Record<string, unknown>> = [];
  await page.route(`**/api/v1/customers/${customerId}/appointments**`, (route) =>
    route.fulfill({ json: pageOf([]) }),
  );
  await page.route(`**/api/v1/customers/${customerId}/files**`, async (route) => {
    if (route.request().method() === "POST") {
      const record = {
        id: "56666666-6666-4666-8666-666666666666",
        customerId,
        kind: "KVKK",
        originalName: "kvkk.pdf",
        contentType: "application/pdf",
        sizeBytes: 12,
        createdAt: now,
      };
      files.push(record);
      await route.fulfill({ status: 201, json: record });
      return;
    }
    await route.fulfill({ json: files });
  });
  await page.route(`**/api/v1/customers/${customerId}`, (route) =>
    route.fulfill({ json: customer }),
  );

  await page.goto(`/settings/customers/${customerId}`);
  await expect(page.getByText("Cari: 0,00 TRY")).toBeVisible();
  await page.getByLabel("Belge türü").selectOption("KVKK");
  await page.getByLabel("Dosya").setInputFiles({
    name: "kvkk.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4"),
  });
  await page.getByRole("button", { name: "Yükle" }).click();
  await expect(page.getByText("kvkk.pdf")).toBeVisible();
  await expect(page.getByText(/KVKK belgesi ·/)).toBeVisible();
});
