import { expect, test } from "@playwright/test";

const businessId = "91111111-1111-4111-8111-111111111111";

function session() {
  return {
    accessToken: "login-test-token",
    expiresIn: 900,
    tokenType: "Bearer",
    user: {
      id: "92222222-2222-4222-8222-222222222222",
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

const emptyPage = {
  items: [],
  page: 1,
  pageSize: 100,
  total: 0,
  totalPages: 0,
  hasMore: false,
};

test("owner logs in through the BFF and reaches the dashboard", async ({
  page,
  context,
}) => {
  let loginBody: Record<string, unknown> | undefined;
  await context.addCookies([
    {
      name: "xenior.refresh",
      value: "login-refresh",
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.route("**/api/auth/login", async (route) => {
    loginBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: session(),
    });
  });
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
        createdAt: "2026-09-05T00:00:00.000Z",
        updatedAt: "2026-09-05T00:00:00.000Z",
      },
    }),
  );
  await page.route("**/api/v1/appointments**", (route) =>
    route.fulfill({ json: emptyPage }),
  );
  await page.route("**/api/v1/customers**", (route) =>
    route.fulfill({ json: { ...emptyPage, pageSize: 1 } }),
  );
  await page.route("**/api/v1/staff**", (route) => route.fulfill({ json: [] }));

  await page.goto("/login");
  await page.getByLabel("E-posta").fill("owner@example.test");
  await page.getByLabel("Parola").fill("super-secret-12");
  const loggedIn = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/auth/login",
  );
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await loggedIn;

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: "Gösterge paneli" }),
  ).toBeVisible();
  expect(loginBody).toMatchObject({
    email: "owner@example.test",
    password: "super-secret-12",
  });
});
