import { expect, test } from "@playwright/test";

const businessId = "41111111-1111-4111-8111-111111111111";
const serviceId = "42222222-2222-4222-8222-222222222222";
const now = "2026-09-05T00:00:00.000Z";

function session(role: "BUSINESS_OWNER" | "STAFF") {
  return {
    accessToken: "service-test-token",
    expiresIn: 900,
    tokenType: "Bearer",
    user: {
      id: "43333333-3333-4333-8333-333333333333",
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
  description: "Standart kesim",
  durationMinutes: 45,
  price: "350.00",
  currency: "TRY",
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

test("owner lists and creates a decimal-safe tenant service", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("BUSINESS_OWNER") }),
  );
  let body: Record<string, unknown> | undefined;
  let tenantHeader: string | null = null;
  await page.route("**/api/v1/services**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      body = request.postDataJSON() as Record<string, unknown>;
      tenantHeader = await request.headerValue("X-Business-Id");
      await route.fulfill({ status: 201, json: { ...service, ...body } });
      return;
    }
    if (new URL(request.url()).pathname.endsWith(`/${serviceId}`)) {
      await route.fulfill({ json: service });
      return;
    }
    await route.fulfill({ json: [service] });
  });

  await page.goto("/settings/services");
  await expect(page.getByRole("heading", { name: "Hizmetler" })).toBeVisible();
  await expect(page.getByText("Saç Kesimi")).toBeVisible();
  await page.getByRole("link", { name: "Yeni hizmet" }).click();
  await page.getByLabel("Hizmet adı").fill("Cilt Bakımı");
  await page.getByLabel("Süre (dakika)").fill("60");
  await page.getByLabel("Fiyat").fill("425.5");
  await page.getByRole("button", { name: "Hizmet oluştur" }).click();

  await expect(page).toHaveURL(new RegExp(`/settings/services/${serviceId}$`));
  expect(tenantHeader).toBe(businessId);
  expect(body).toMatchObject({
    name: "Cilt Bakımı",
    durationMinutes: 60,
    price: "425.50",
  });
  expect(body).not.toHaveProperty("businessId");
});

test("staff sees service details as read-only", async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("STAFF") }),
  );
  await page.route(`**/api/v1/services/${serviceId}`, (route) =>
    route.fulfill({ json: service }),
  );
  await page.goto(`/settings/services/${serviceId}`);
  await expect(
    page.getByText(
      "STAFF rolü hizmet bilgilerini görüntüleyebilir ancak değiştiremez.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Düzenle" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pasifleştir" })).toHaveCount(0);
});

test("owner deactivates a service", async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("BUSINESS_OWNER") }),
  );
  let active = true;
  await page.route(`**/api/v1/services/${serviceId}`, async (route) => {
    if (route.request().method() === "PATCH") {
      active = false;
      await route.fulfill({ json: { ...service, isActive: active } });
      return;
    }
    await route.fulfill({ json: { ...service, isActive: active } });
  });
  await page.goto(`/settings/services/${serviceId}`);
  await page.getByRole("button", { name: "Pasifleştir" }).click();
  await page.getByRole("button", { name: "Onayla" }).click();
  await expect(page.getByText("Değişiklik kaydedildi.").first()).toBeVisible();
  await expect(page.getByText("Pasif hizmet")).toBeVisible();
});
