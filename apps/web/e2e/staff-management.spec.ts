import { expect, test } from "@playwright/test";
import { mockSubscriptionAccess } from "./helpers/subscription-access";

const businessId = "31111111-1111-4111-8111-111111111111";
const staffId = "32222222-2222-4222-8222-222222222222";
const specializationId = "33333333-3333-4333-8333-333333333333";
const now = "2026-09-05T00:00:00.000Z";

function session(role: "BUSINESS_OWNER" | "STAFF") {
  return {
    accessToken: "staff-test-token",
    expiresIn: 900,
    tokenType: "Bearer",
    user: {
      id: "34444444-4444-4444-8444-444444444444",
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

const staff = {
  id: staffId,
  firstName: "Ada",
  lastName: "Lovelace",
  phone: "+905551112233",
  email: "ada@example.test",
  notes: "Lead stylist",
  loginRole: "STAFF",
  isActive: true,
  specializations: [
    {
      id: specializationId,
      name: "Hair Styling",
      isActive: true,
      assignedAt: now,
    },
  ],
  createdAt: now,
  updatedAt: now,
};

const specialty = {
  id: specializationId,
  name: "Hair Styling",
  isActive: true,
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

test("owner lists and creates tenant-scoped staff", async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("BUSINESS_OWNER") }),
  );
  await page.route("**/api/v1/specializations**", (route) =>
    route.fulfill({ json: [specialty] }),
  );
  await page.route("**/api/v1/commissions/entries**", (route) =>
    route.fulfill({
      json: {
        items: [],
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    }),
  );

  let createBody: Record<string, unknown> | undefined;
  let tenantHeader: string | null = null;
  await page.route("**/api/v1/staff**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      createBody = request.postDataJSON() as Record<string, unknown>;
      tenantHeader = await request.headerValue("X-Business-Id");
      await route.fulfill({
        status: 201,
        json: { ...staff, ...createBody },
      });
      return;
    }
    if (new URL(request.url()).pathname.endsWith(`/${staffId}/hours`)) {
      await route.fulfill({
        json: {
          days: Array.from({ length: 7 }, (_, weekday) => ({
            weekday,
            startMinutes: 540,
            endMinutes: 1140,
            isClosed: weekday === 0,
          })),
        },
      });
      return;
    }
    if (new URL(request.url()).pathname.endsWith(`/${staffId}`)) {
      await route.fulfill({ json: staff });
      return;
    }
    await route.fulfill({ json: [staff] });
  });

  await page.goto("/settings/staff");
  await expect(page.getByRole("heading", { name: "Personel" })).toBeVisible();
  await expect(page.getByText("Ada Lovelace")).toBeVisible();
  await page.getByRole("link", { name: "Yeni kullanıcı" }).click();
  await page.getByLabel("Ad", { exact: true }).fill("Grace");
  await page.getByLabel("Soyad", { exact: true }).fill("Hopper");
  const created = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/api\/v1\/staff\/?$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole("button", { name: "Kullanıcı oluştur" }).click();
  await created;

  await expect(page).toHaveURL(new RegExp(`/settings/staff/${staffId}$`), {
    timeout: 15_000,
  });
  expect(tenantHeader).toBe(businessId);
  expect(createBody).toMatchObject({
    firstName: "Grace",
    lastName: "Hopper",
  });
  expect(createBody).not.toHaveProperty("businessId");
});

test("staff role receives read-only staff details", async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("STAFF") }),
  );
  await page.route(`**/api/v1/staff/${staffId}/hours`, (route) =>
    route.fulfill({
      json: {
        days: Array.from({ length: 7 }, (_, weekday) => ({
          weekday,
          startMinutes: 540,
          endMinutes: 1140,
          isClosed: weekday === 0,
        })),
      },
    }),
  );
  await page.route(`**/api/v1/staff/${staffId}`, (route) =>
    route.fulfill({ json: staff }),
  );
  await page.route("**/api/v1/specializations**", (route) =>
    route.fulfill({ json: [specialty] }),
  );

  await page.goto(`/settings/staff/${staffId}`);
  await expect(
    page.getByText(
      "STAFF rolü personel bilgilerini görüntüleyebilir ancak değiştiremez.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Düzenle" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pasifleştir" })).toHaveCount(0);
});

test("owner adds and deactivates a specialization", async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("BUSINESS_OWNER") }),
  );
  let active = true;
  let postedName = "";
  await page.route("**/api/v1/specializations**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      postedName = (request.postDataJSON() as { name: string }).name;
      await route.fulfill({
        status: 201,
        json: { ...specialty, name: postedName },
      });
      return;
    }
    if (request.method() === "PATCH") {
      active = false;
      await route.fulfill({ json: { ...specialty, isActive: false } });
      return;
    }
    await route.fulfill({ json: [{ ...specialty, isActive: active }] });
  });

  await page.goto("/settings/specializations");
  await page.getByLabel("Uzmanlık adı").fill("Coloring");
  await page.getByRole("button", { name: "Ekle" }).click();
  await expect(page.getByText("Değişiklik kaydedildi.").first()).toBeVisible();
  expect(postedName).toBe("Coloring");

  await page.getByRole("button", { name: "Kaldır" }).click();
  await expect(page.getByText("Pasif")).toBeVisible();
});
