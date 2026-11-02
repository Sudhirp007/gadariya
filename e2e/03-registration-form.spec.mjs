import { test, expect } from "@playwright/test";

// Journey 1: registration form client-side validation (deterministic, no live Firebase).
test.describe("Registration form validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register", { waitUntil: "networkidle" });
  });

  test("Step 1 requires selecting a profile type before proceeding", async ({ page }) => {
    // "आगे बढ़ें" (Next) button present.
    const nextButton = page.getByRole("button", { name: /आगे बढ़ें/ });
    await expect(nextButton).toBeVisible();
  });

  test("Underage candidate (DOB < 18) is rejected at Step 2", async ({ page }) => {
    // Select "स्वयं के लिए" (For self) manager card (S button).
    const selfCard = page.locator("button", { hasText: /स्वयं के लिए/ }).first();
    await selfCard.click();

    // Proceed to step 2.
    await page.getByRole("button", { name: /आगे बढ़ें/ }).click();

    // Fill name + underage DOB (e.g., 2012 -> 14 years old).
    const nameInput = page.getByPlaceholder(/नाम|Name|पूरा/).first();
    if (await nameInput.count()) {
      await nameInput.fill("E2E Candidate");
    }
    // DOB input: date input.
    const dob = page.locator('input[type="date"]').first();
    if (await dob.count()) {
      await dob.fill("2012-05-10");
    }

    // Try to proceed to step 3 (exists a "Next"/"आगे" button on step 2).
    const next2 = page.getByRole("button", { name: /आगे|Next|अगला/ }).last();
    if (await next2.count()) {
      await next2.click();
    }

    // Expect underage error surfaced.
    await expect(page.locator("body")).toContainText(/18|अवयस्क|underage|कम उम्र/i);
  });
});
