import { test, expect } from "@playwright/test";

test("smoke: scan page renders and upload triggers chooser", async ({ page }) => {
  await page.goto("/scan");
  await expect(page.getByRole("heading", { name: /scan lead/i })).toBeVisible();

  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: /upload/i }).click(),
  ]);
  // Don't actually upload in smoke test (avoids requiring Supabase/Vision keys here).
  await expect(chooser).toBeTruthy();
});

test("smoke: leads page renders shell UI", async ({ page }) => {
  await page.goto("/leads");
  await expect(page.getByRole("heading", { name: /pipeline/i })).toBeVisible();
  await expect(page.getByPlaceholder(/search leads/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /all leads/i })).toBeVisible();
});
