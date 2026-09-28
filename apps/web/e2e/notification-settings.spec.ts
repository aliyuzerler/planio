import { expect, test } from "@playwright/test";
import { mockSubscriptionAccess } from "./helpers/subscription-access";

const businessId = "71111111-1111-4111-8111-111111111111";
const now = "2026-09-05T00:00:00.000Z";

function session(role: "BUSINESS_OWNER" | "STAFF") {
  return {
    accessToken: "notification-test-token",
    expiresIn: 900,
    tokenType: "Bearer",
    user: {
      id: "72222222-2222-4222-8222-222222222222",
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

const settings = {
  businessId,
  smsEnabled: true,
  whatsappEnabled: true,
  emailEnabled: true,
  pushEnabled: true,
  notifyOnCreated: true,
  notifyOnRescheduled: true,
  notifyOnCancelled: true,
  reminderEnabled: true,
  reminderMinutesBefore: 60,
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

test("owner updates notification settings and sees failed deliveries", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("BUSINESS_OWNER") }),
  );
  let current = { ...settings };
  await page.route("**/api/v1/notifications/setup**", (route) =>
    route.fulfill({
      json: [
        {
          channel: "SMS",
          provider: null,
          configured: false,
          lastTestedAt: null,
          lastTestError: null,
          hint: "NetGSM kullanıcı kodu, parola ve mesaj başlığını girin.",
        },
      ],
    }),
  );
  await page.route("**/api/v1/notifications/settings", async (route) => {
    if (route.request().method() === "PATCH") {
      current = { ...current, ...route.request().postDataJSON(), updatedAt: now };
      await route.fulfill({ json: current });
      return;
    }
    await route.fulfill({ json: current });
  });
  await page.route("**/api/v1/notifications?**", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: "73333333-3333-4333-8333-333333333333",
            businessId,
            appointmentId: null,
            type: "APPOINTMENT_CONFIRMED",
            channel: "SMS",
            status: "FAILED",
            destination: null,
            subject: null,
            body: "Xenior: randevunuz onaylandı.",
            provider: "mock-sms",
            attemptCount: 1,
            scheduledAt: null,
            sentAt: null,
            lastAttemptAt: now,
            errorCode: "MISSING_DESTINATION",
            errorMessage: "Notification destination is required.",
            createdAt: now,
            updatedAt: now,
          },
        ],
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
        hasMore: false,
      },
    }),
  );

  await page.goto("/settings/notifications");
  await expect(page.getByRole("heading", { name: "Bildirimler" })).toBeVisible();
  await expect(page.getByText("MISSING_DESTINATION")).toBeVisible();
  await page.getByLabel("Hatırlatma süresi").selectOption("1440");
  await page.getByRole("button", { name: "Ayarları kaydet" }).click();
  await expect(page.getByText("Bildirim ayarları kaydedildi.").first()).toBeVisible();
});

test("staff sees notification settings as read-only", async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: session("STAFF") }),
  );
  await page.route("**/api/v1/notifications/settings", (route) =>
    route.fulfill({ json: settings }),
  );
  await page.goto("/settings/notifications");
  await expect(page.getByLabel("SMS")).toBeDisabled();
  await expect(
    page.getByText("Personel bildirim ayarlarını yalnızca görüntüleyebilir."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Ayarları kaydet" })).toHaveCount(
    0,
  );
});
