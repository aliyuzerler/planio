import { expect, test } from "@playwright/test";

const businessId = "81111111-aaaa-4111-8111-111111111111";
const now = "2026-09-05T00:00:00.000Z";
const periodEnd = "2026-10-05T00:00:00.000Z";

const starterMonthly = {
  id: "81111111-1111-4111-8111-111111111111",
  name: "Starter",
  billingPeriod: "MONTHLY",
  price: "499.00",
  currency: "TRY",
  isActive: true,
  limits: { maxStaff: 3, maxCustomers: 50, advancedFeatures: false },
};

const starterSemiannual = {
  id: "85555555-5555-4555-8555-555555555555",
  name: "Starter",
  billingPeriod: "SEMIANNUAL",
  price: "2495.00",
  currency: "TRY",
  isActive: true,
  limits: { maxStaff: 3, maxCustomers: 50, advancedFeatures: false },
};

const professionalYearly = {
  id: "84444444-4444-4444-8444-444444444444",
  name: "Professional",
  billingPeriod: "YEARLY",
  price: "14990.00",
  currency: "TRY",
  isActive: true,
  limits: { maxStaff: 15, maxCustomers: 500, advancedFeatures: true },
};

function session(role: "BUSINESS_OWNER" | "STAFF") {
  return {
    accessToken: "subscription-test-token",
    expiresIn: 900,
    tokenType: "Bearer",
    user: {
      id: "82222222-2222-4222-8222-222222222222",
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

function subscription(plan = starterMonthly, status = "ACTIVE") {
  return {
    id: "83333333-3333-4333-8333-333333333333",
    businessId,
    status,
    startedAt: now,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    cancelledAt: status === "CANCELLED" ? now : null,
    cancelAtPeriodEnd: status === "CANCELLED",
    externalProvider: status === "ACTIVE" ? "IYZICO" : null,
    externalSubscriptionId: status === "ACTIVE" ? "sub-1" : null,
    plan,
    createdAt: now,
    updatedAt: now,
  };
}

function access(plan = starterMonthly, status: string | null = "ACTIVE") {
  return {
    hasAccess: status !== "EXPIRED",
    status,
    plan: status ? plan : null,
    limits: plan.limits,
    usage: { staff: 1, customers: 4 },
  };
}

const business = {
  id: businessId,
  name: "Xenior Beauty",
  phone: "+905551112233",
  email: "owner@example.test",
  address: "Salon Street 1",
  timezone: "Europe/Istanbul",
  currency: "TRY",
  status: "ACTIVE",
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
  // Subscription page always mounts AvailablePlans → useBusinessProfile / usePayments.
  await page.route("**/api/v1/business", (route) =>
    route.fulfill({ json: business }),
  );
  await page.route("**/api/v1/payments", (route) => route.fulfill({ json: [] }));
});

test("owner sees plans, pays with iyzico, and views subscription status", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("BUSINESS_OWNER") }),
  );
  let current: ReturnType<typeof subscription> | null = null;
  await page.route("**/api/v1/plans", (route) =>
    route.fulfill({ json: [starterMonthly, starterSemiannual, professionalYearly] }),
  );
  await page.route("**/api/v1/business", (route) =>
    route.fulfill({ json: business }),
  );
  await page.route("**/api/v1/payments", (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "GET" && url.pathname.endsWith("/payments")) {
      return route.fulfill({ json: [] });
    }
    return route.fallback();
  });
  await page.route("**/api/v1/subscriptions/current", (route) =>
    route.fulfill({ json: current }),
  );
  await page.route("**/api/v1/subscriptions/access", (route) =>
    route.fulfill({
      json: current
        ? access(current.plan, current.status)
        : {
            hasAccess: true,
            status: null,
            plan: null,
            limits: { maxStaff: null, maxCustomers: null, advancedFeatures: false },
            usage: { staff: 0, customers: 0 },
          },
    }),
  );
  await page.route("**/api/v1/payments/checkout", async (route) => {
    const body = route.request().postDataJSON() as { planId: string };
    const plan =
      body.planId === professionalYearly.id ? professionalYearly : starterMonthly;
    const pending = subscription(plan, "TRIALING");
    current = pending;
    await route.fulfill({
      json: {
        payment: {
          id: "85555555-5555-4555-8555-555555555555",
          businessId,
          subscriptionId: pending.id,
          amount: plan.price,
          currency: plan.currency,
          status: "PROCESSING",
          provider: "IYZICO",
          externalPaymentId: null,
          externalReference: "mock-token",
          paidAt: null,
          failedAt: null,
          errorCode: null,
          errorMessage: null,
          createdAt: now,
          updatedAt: now,
        },
        subscription: pending,
        checkout: {
          token: "mock-token",
          paymentPageUrl: "http://localhost:3000/settings/subscription?checkoutToken=mock-token",
          tokenExpireTime: 1800,
        },
      },
    });
  });
  await page.route("**/api/v1/payments/*/sync", async (route) => {
    current = subscription(starterMonthly, "ACTIVE");
    await route.fulfill({
      json: {
        id: "85555555-5555-4555-8555-555555555555",
        businessId,
        subscriptionId: current.id,
        amount: starterMonthly.price,
        currency: "TRY",
        status: "SUCCEEDED",
        provider: "IYZICO",
        externalPaymentId: "sub-1",
        externalReference: "mock-token",
        paidAt: now,
        failedAt: null,
        errorCode: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      },
    });
  });

  await page.goto("/settings/subscription");
  await expect(page.getByRole("heading", { name: "Abonelik" })).toBeVisible();
  await expect(page.getByText("Henüz doğrulanmış bir abonelik yok.")).toBeVisible();
  await expect(page.getByText("Starter · 6 aylık")).toBeVisible();
  await expect(page.getByText("₺2.495,00")).toBeVisible();
  await expect(page.getByText("₺499,00")).toBeVisible();
  await page.getByRole("button", { name: "Planı seç" }).first().click();
  await page.getByLabel("T.C. kimlik no").fill("11111111110");
  await page.getByLabel("GSM").fill("+905551112233");
  await page.getByLabel("Adres").fill("Test Street 1");
  await page.getByLabel("Şehir").fill("Istanbul");
  await page.getByLabel("Mesafeli satış sözleşmesini kabul ediyorum").check();
  await page.getByRole("button", { name: "iyzico ile öde" }).click();
  await expect(page.getByText("Ödeme doğrulandı. Abonelik aktif.").first()).toBeVisible();
  await expect(page.getByText("Aktif", { exact: true })).toBeVisible();
});

test("staff sees subscription information as read-only", async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("STAFF") }),
  );
  await page.route("**/api/v1/plans", (route) =>
    route.fulfill({ json: [starterMonthly, professionalYearly] }),
  );
  await page.route("**/api/v1/subscriptions/current", (route) =>
    route.fulfill({ json: subscription() }),
  );
  await page.route("**/api/v1/subscriptions/access", (route) =>
    route.fulfill({ json: access() }),
  );

  await page.goto("/settings/subscription");
  await expect(page.getByText("Starter", { exact: true })).toBeVisible();
  await expect(page.getByText("Aktif", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Personel abonelik bilgilerini yalnızca görüntüleyebilir."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Planı seç" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Aboneliği iptal et" })).toHaveCount(
    0,
  );
});

test("expired license redirects write screens to subscription", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("BUSINESS_OWNER") }),
  );
  await page.route("**/api/v1/plans", (route) =>
    route.fulfill({ json: [starterMonthly, starterSemiannual] }),
  );
  await page.route("**/api/v1/subscriptions/current", (route) =>
    route.fulfill({ json: subscription(starterMonthly, "EXPIRED") }),
  );
  await page.route("**/api/v1/subscriptions/access", (route) =>
    route.fulfill({ json: access(starterMonthly, "EXPIRED") }),
  );
  await page.route("**/api/v1/payments", (route) => route.fulfill({ json: [] }));
  // Appointment form mounts briefly before paywall redirect; keep live API 401s from logging out.
  await page.route("**/api/v1/business", (route) =>
    route.fulfill({ json: business }),
  );
  await page.route("**/api/v1/staff**", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/v1/services**", (route) =>
    route.fulfill({ json: [] }),
  );
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
  await expect(page).toHaveURL(/\/settings\/subscription$/);
  await expect(page.getByRole("heading", { name: "Abonelik" })).toBeVisible();
  await expect(
    page.getByText("İşletme lisansının süresi doldu. Yazma ekranları kilitli."),
  ).toBeVisible();
});
