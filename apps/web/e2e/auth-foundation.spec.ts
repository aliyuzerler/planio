import { expect, test } from "@playwright/test";

test("guest is redirected from the protected dashboard", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Giriş yap" })).toBeVisible();
});

test("registration foundation is available", async ({ page }) => {
  await page.goto("/register");

  await expect(
    page.getByRole("heading", { name: "İşletme hesabı oluştur" }),
  ).toBeVisible();
  await expect(page.getByLabel("E-posta")).toBeVisible();
  await expect(page.getByLabel("Parola (en az 12 karakter)")).toBeVisible();
});
