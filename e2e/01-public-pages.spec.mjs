import { test, expect } from "@playwright/test";

// Journey 1-2, 9: public pages render, no console errors, core UI present.
test.describe("Public pages render without console errors", () => {
  const pages = [
    { path: "/register", heading: /पंजीकरण/ },
    { path: "/login", heading: /लॉग|Sign in|Login/ },
    { path: "/discovery", heading: /खोज|Discovery/ },
  ];

  for (const p of pages) {
    test(`renders ${p.path}`, async ({ page }) => {
      const errors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(String(err)));

      await page.goto(p.path, { waitUntil: "networkidle" });
      await expect(page).toHaveTitle(/Pal Matrimony/);
      await expect(page.locator("body")).toContainText(p.heading);

      expect(errors, `console errors on ${p.path}: ${errors.join(" | ")}`).toEqual([]);
    });
  }
});
