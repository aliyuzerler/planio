import { expect, test, type Page } from "@playwright/test";

const businessId = "61111111-1111-4111-8111-111111111111";
const appointmentId = "62222222-2222-4222-8222-222222222222";
const otherAppointmentId = "68888888-8888-4888-8888-888888888888";
const customerId = "63333333-3333-4333-8333-333333333333";
const otherCustomerId = "69999999-9999-4999-8999-999999999999";
const staffId = "64444444-4444-4444-8444-444444444444";
const otherStaffId = "65555555-5555-4555-8666-666666666666";
const serviceId = "65555555-5555-4555-8555-555555555555";
const now = "2026-09-05T00:00:00.000Z";

function session() {
  return {
    accessToken: "appointment-test-token",
    expiresIn: 900,
    tokenType: "Bearer",
    user: {
      id: "66666666-6666-4666-8666-666666666666",
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

const appointment = {
  id: appointmentId,
  customer: { id: customerId, firstName: "Ada", lastName: "Lovelace" },
  staff: { id: staffId, firstName: "Stylist", lastName: "One" },
  service: { id: serviceId, name: "Hair Cut" },
  startAt: "2033-01-15T10:00:00.000Z",
  endAt: "2033-01-15T11:00:00.000Z",
  status: "CONFIRMED",
  notes: "First visit",
  createdByUserId: "66666666-6666-4666-8666-666666666666",
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
  events: [
    {
      id: "67777777-7777-4777-8777-777777777777",
      type: "CREATED",
      previousStartAt: null,
      previousEndAt: null,
      newStartAt: "2033-01-15T10:00:00.000Z",
      newEndAt: "2033-01-15T11:00:00.000Z",
      previousStatus: null,
      newStatus: "CONFIRMED",
      createdAt: now,
    },
  ],
};

const otherAppointment = {
  ...appointment,
  id: otherAppointmentId,
  customer: { id: otherCustomerId, firstName: "Grace", lastName: "Hopper" },
  staff: { id: otherStaffId, firstName: "Stylist", lastName: "Two" },
  startAt: "2033-01-15T12:00:00.000Z",
  endAt: "2033-01-15T13:00:00.000Z",
  serviceNameSnapshot: "Color",
};

function pageJson(items: unknown[]) {
  return {
    items,
    page: 1,
    pageSize: 100,
    total: items.length,
    totalPages: 1,
    hasMore: false,
  };
}

function includesTargetDay(url: string) {
  const parsed = new URL(url);
  const date = parsed.searchParams.get("date");
  const from = parsed.searchParams.get("from");
  const to = parsed.searchParams.get("to");
  if (date) return date === "2033-01-15";
  if (from && to) return from <= "2033-01-15" && to >= "2033-01-15";
  return false;
}

async function mockCatalog(page: Page) {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session() }),
  );
  await page.route("**/api/v1/staff**", (route) =>
    route.fulfill({
      json: [
        {
          id: staffId,
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
          id: otherStaffId,
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
  await page.route("**/api/v1/resources**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/v1/services**", (route) =>
    route.fulfill({
      json: [
        {
          id: serviceId,
          name: "Hair Cut",
          description: null,
          durationMinutes: 60,
          price: "250.00",
          currency: "TRY",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
    }),
  );
  await page.route("**/api/v1/customers**", (route) =>
    route.fulfill({
      json: pageJson([
        {
          id: customerId,
          firstName: "Ada",
          lastName: "Lovelace",
          phone: null,
          email: null,
          birthDate: null,
          notes: null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ]),
    }),
  );
  await page.route("**/api/v1/campaigns/quote**", (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      json: {
        serviceId: url.searchParams.get("serviceId") ?? serviceId,
        listPrice: "250.00",
        discountAmount: "0.00",
        payableAmount: "250.00",
        currency: "TRY",
        campaignId: null,
        campaignName: null,
      },
    });
  });
}

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

test("owner lists and creates a tenant-scoped appointment", async ({
  page,
}) => {
  await mockCatalog(page);

  let body: Record<string, unknown> | undefined;
  let tenantHeader: string | null = null;
  await page.route("**/api/v1/appointments**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      body = request.postDataJSON() as Record<string, unknown>;
      tenantHeader = await request.headerValue("X-Business-Id");
      await route.fulfill({ status: 201, json: appointment });
      return;
    }
    if (new URL(request.url()).pathname.endsWith(`/${appointmentId}`)) {
      await route.fulfill({ json: appointment });
      return;
    }
    await route.fulfill({
      json: pageJson(includesTargetDay(request.url()) ? [appointment] : []),
    });
  });

  await page.goto("/settings/appointments");
  await expect(page.getByRole("heading", { name: "Randevular" })).toBeVisible();
  await page.getByLabel("Tarih").fill("2033-01-15");
  await expect(page.getByText("Ada Lovelace")).toBeVisible();
  await page.getByRole("link", { name: "Yeni randevu" }).click();
  await page.getByLabel("Müşteri").selectOption(customerId);
  await page.getByLabel("Personel").selectOption(staffId);
  await page.getByLabel("Hizmet").selectOption(serviceId);
  await page.getByLabel("Başlangıç").fill("2033-01-15T10:00");
  const created = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/api\/v1\/appointments\/?$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole("button", { name: "Randevu oluştur" }).click();
  await created;

  await expect(page).toHaveURL(
    new RegExp(`/settings/appointments/${appointmentId}$`),
    { timeout: 15_000 },
  );
  expect(tenantHeader).toBe(businessId);
  expect(body).toMatchObject({
    customerId,
    staffId,
    serviceId,
  });
  expect(body).not.toHaveProperty("businessId");
  expect(body).not.toHaveProperty("endAt");
});

test("calendar filters by staff and supports appointment actions", async ({
  page,
}) => {
  await mockCatalog(page);

  let lastListUrl = "";
  let cancelled = false;
  await page.route("**/api/v1/appointments**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "POST" && url.pathname.endsWith("/cancel")) {
      cancelled = true;
      await route.fulfill({
        json: { ...appointment, status: "CANCELLED" },
      });
      return;
    }
    if (url.pathname.endsWith(`/${appointmentId}`)) {
      await route.fulfill({
        json: cancelled ? { ...appointment, status: "CANCELLED" } : appointment,
      });
      return;
    }
    if (request.method() === "GET" && url.pathname.endsWith("/appointments")) {
      lastListUrl = request.url();
      const requestedStaff = url.searchParams.get("staffId");
      const items = [appointment, otherAppointment].filter((item) => {
        if (!includesTargetDay(request.url())) return false;
        return !requestedStaff || item.staff.id === requestedStaff;
      });
      await route.fulfill({ json: pageJson(items) });
      return;
    }
    await route.fallback();
  });

  await page.goto("/settings/appointments");
  await page.getByRole("button", { name: "Hafta" }).click();
  await page.getByLabel("Tarih").fill("2033-01-15");
  await expect(page.getByText("Ada Lovelace")).toBeVisible();
  await expect(page.getByText("Grace Hopper")).toBeVisible();
  expect(lastListUrl).toContain("from=");
  expect(lastListUrl).toContain("to=");
  expect(lastListUrl).not.toContain("date=");

  await page.getByLabel("Personel filtresi").selectOption(staffId);
  await expect(page.getByText("Ada Lovelace")).toBeVisible();
  await expect(page.getByText("Grace Hopper")).toHaveCount(0);
  expect(lastListUrl).toContain(`staffId=${staffId}`);

  await page.getByRole("button", { name: "Gün", exact: true }).click();
  await expect(page.getByText("Ada Lovelace")).toBeVisible();
  await page.getByRole("link", { name: "Ada Lovelace randevusu" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/settings/appointments/${appointmentId}$`),
    { timeout: 15_000 },
  );
  await expect(page.getByText("Hair Cut")).toBeVisible();
  await expect(page.getByText("Stylist One")).toBeVisible();
  await page.getByRole("button", { name: "İptal et" }).click();
  await page.getByRole("button", { name: "Onayla" }).click();
  await expect(page.getByText("Randevu iptal edildi.").first()).toBeVisible();
  await expect(page.getByText("İptal").first()).toBeVisible();
});

test("owner reschedules a confirmed appointment", async ({ page }) => {
  await mockCatalog(page);

  let rescheduleBody: Record<string, unknown> | undefined;
  await page.route("**/api/v1/appointments**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "POST" && url.pathname.endsWith("/reschedule")) {
      rescheduleBody = request.postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        json: {
          ...appointment,
          startAt: "2033-01-15T14:00:00.000Z",
          endAt: "2033-01-15T15:00:00.000Z",
        },
      });
      return;
    }
    if (url.pathname.endsWith(`/${appointmentId}`)) {
      await route.fulfill({ json: appointment });
      return;
    }
    await route.fulfill({
      json: pageJson(includesTargetDay(request.url()) ? [appointment] : []),
    });
  });

  await page.goto(`/settings/appointments/${appointmentId}`);
  await page.getByRole("button", { name: "Yeniden planla" }).click();
  await page.getByLabel("Başlangıç").fill("2033-01-15T14:00");
  await page.getByRole("button", { name: "Yeni saati kaydet" }).click();
  await expect(page.getByText("Randevu yeniden planlandı.").first()).toBeVisible();
  expect(rescheduleBody).toMatchObject({
    customerId,
    staffId,
    serviceId,
  });
  expect(rescheduleBody).not.toHaveProperty("endAt");
});

test("calendar month view drag-and-drop reschedules through the API", async ({
  page,
}) => {
  await mockCatalog(page);

  let rescheduleBody: Record<string, unknown> | undefined;
  await page.route("**/api/v1/appointments**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "POST" && url.pathname.endsWith("/reschedule")) {
      rescheduleBody = request.postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        json: {
          ...appointment,
          startAt: "2033-01-16T10:00:00.000Z",
          endAt: "2033-01-16T11:00:00.000Z",
        },
      });
      return;
    }
    if (url.pathname.endsWith(`/${appointmentId}`)) {
      await route.fulfill({ json: appointment });
      return;
    }
    await route.fulfill({
      json: pageJson(includesTargetDay(request.url()) ? [appointment] : []),
    });
  });

  await page.goto("/settings/appointments");
  await page.getByRole("button", { name: "Ay" }).click();
  await page.getByLabel("Tarih").fill("2033-01-15");
  await expect(
    page.getByRole("link", { name: "Ada Lovelace randevusu" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Ada Lovelace randevusu" })
    .dragTo(page.locator('[data-calendar-day="2033-01-16"]'));
  await expect.poll(() => rescheduleBody).toBeTruthy();
  expect(rescheduleBody).toHaveProperty("startAt");
});

