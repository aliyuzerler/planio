import { expect, test } from "@playwright/test";

test("home page renders the product name", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Planio ana sayfa" })).toBeVisible();
  await expect(page.getByAltText("Planio").first()).toBeVisible();
});
