import { test, expect } from "@playwright/test";
import { memberCookie } from "./helpers.mjs";

// Journeys 9-10: verification page renders; admin login renders with MFA.
// Journeys 3/8: authenticated pages render with a valid minted session.
test.describe("Verification, admin and authenticated page rendering", () => {
  test("Verification page renders badge tier content", async ({ page }) => {
    await page.goto("/verification", { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/Pal Matrimony/);
    await expect(page.locator("body")).toContainText(/सत्यापन|Verification|स्वयं/i);
  });

  test("Admin login page renders", async ({ page }) => {
    await page.goto("/admin/login", { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/Pal Matrimony/);
    await expect(page.locator("body")).toContainText(/प्रशासन|Admin|MFA/i);
  });

  test("Authenticated profile page renders with minted session", async ({ page }) => {
    await page.context().addCookies([memberCookie()]);
    await page.goto("/profile", { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/Pal Matrimony/);
    await expect(page.locator("body")).toContainText(/प्रोफाइल|Profile/i);
  });

  test("Authenticated privacy settings page renders", async ({ page }) => {
    await page.context().addCookies([memberCookie()]);
    await page.goto("/settings/privacy", { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/Pal Matrimony/);
    await expect(page.locator("body")).toContainText(/गोपनीयता|Privacy/i);
  });
});
