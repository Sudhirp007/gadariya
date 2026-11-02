import { chromium } from "playwright";

const BASE_URL = "https://gadariya-livid.vercel.app";

async function runE2E() {
  console.log(`\n========================================`);
  console.log(`E2E User Verification on: ${BASE_URL}`);
  console.log(`========================================\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const results = [];

  // Helper to record result
  const record = (name, passed, details = "") => {
    results.push({ name, passed, details });
    console.log(`${passed ? "✓ PASS" : "✗ FAIL"}: ${name} ${details ? `(${details})` : ""}`);
  };

  try {
    // TEST 1: Homepage
    console.log("1. Visiting Homepage...");
    const homeRes = await page.goto(BASE_URL, { waitUntil: "networkidle" });
    const homeTitle = await page.title();
    record("Homepage loads with 200 OK", homeRes.status() === 200, `Title: ${homeTitle}`);
    
    // Check Brand Logo and Navigation
    const hasBrand = await page.locator("text=Pal Matrimony, text=पाल मैट्रिमोनी").first().isVisible();
    record("Brand identity is visible", hasBrand);

    // TEST 2: Discovery Page
    console.log("\n2. Visiting Discovery Page...");
    const discRes = await page.goto(`${BASE_URL}/discovery`, { waitUntil: "networkidle" });
    record("Discovery page loads with 200 OK", discRes.status() === 200);

    // Verify Zero Raw PII on discovery
    const pageContent = await page.content();
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(pageContent);
    // Note: only check if unencrypted phone numbers appear
    const hasPhone = /\+91[0-9]{10}/.test(pageContent);
    record("Zero Raw PII on Discovery (No phone/email leakage)", !hasEmail && !hasPhone);

    // TEST 3: Login Page
    console.log("\n3. Visiting Login Page...");
    const loginRes = await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    record("Login page loads with 200 OK", loginRes.status() === 200);

    const hasPhoneInput = await page.locator("input[type='tel']").isVisible();
    record("Login phone input is visible", hasPhoneInput);

    // TEST 4: Register Flow Step 1 & 2
    console.log("\n4. Visiting Register Page...");
    const regRes = await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
    record("Register page loads with 200 OK", regRes.status() === 200);

    // Step 1: Profile Manager selection
    await page.locator("button:has-text('Next'), button:has-text('आगे')").first().click();
    await page.waitForTimeout(600);

    // Step 2: Translation Check
    const step2Content = await page.innerText("body");
    const hasBrokenKeys = /register\.(name|firstName)|profile\.(height|maritalStatus|neverMarried)/.test(step2Content);
    record("Step 2 labels are properly translated (No raw keys)", !hasBrokenKeys);

    // Fill Step 2 Form
    await page.locator("input[placeholder*='Name'], input[placeholder*='नाम']").first().fill("Sudhir Pal");
    await page.locator("input[type='date']").first().fill("1993-06-05");
    await page.locator("input[placeholder*='Pradesh'], input[placeholder*='प्रदेश']").first().fill("Uttar Pradesh");
    await page.locator("input[placeholder*='Indore'], input[placeholder*='शहर']").first().fill("Kanpur");
    record("Step 2 form fields accept user input", true);

    // Proceed to Step 3
    await page.locator("button:has-text('Next'), button:has-text('आगे')").last().click();
    await page.waitForTimeout(600);

    // Step 3: Contact details
    const step3Phone = await page.locator("input[type='tel']").isVisible();
    record("Step 3 Phone input is visible and active", step3Phone);

    // TEST 5: Privacy Settings Page
    console.log("\n5. Visiting Privacy Settings Page...");
    const privRes = await page.goto(`${BASE_URL}/settings/privacy`, { waitUntil: "networkidle" });
    record("Privacy settings page loads with 200 OK", privRes.status() === 200);

    // TEST 6: Admin Login Page
    console.log("\n6. Visiting Admin Portal...");
    const adminRes = await page.goto(`${BASE_URL}/admin/login`, { waitUntil: "networkidle" });
    record("Admin portal login loads with 200 OK", adminRes.status() === 200);

    console.log("\n========================================");
    console.log("E2E Summary:");
    const passedCount = results.filter(r => r.passed).length;
    console.log(`Passed: ${passedCount} / ${results.length}`);
    console.log("========================================\n");

  } finally {
    await browser.close();
  }
}

runE2E().catch(console.error);
