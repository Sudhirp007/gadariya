import { chromium } from "playwright";

async function runTest() {
  console.log("Launching headless browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  page.on("console", msg => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("pageerror", err => console.log("PAGE ERROR:", err.message));

  console.log("Navigating to https://gadariya-livid.vercel.app/register...");
  await page.goto("https://gadariya-livid.vercel.app/register", { waitUntil: "networkidle" });

  console.log("Page loaded. Taking screenshot of Step 1...");
  await page.screenshot({ path: "scratch/step1.png" });

  // Step 1: Select SELF and click Next
  console.log("Clicking Next on Step 1...");
  const nextBtn = page.locator("button:has-text('Next'), button:has-text('आगे')").first();
  await nextBtn.click();
  await page.waitForTimeout(1000);

  console.log("Step 2 loaded. Checking visible texts...");
  const step2Text = await page.innerText("body");
  console.log("Checking for raw keys like 'register.name' or 'profile.height'...");
  const hasRawKeys = /register\.(name|firstName)|profile\.(height|maritalStatus|neverMarried)/.test(step2Text);
  console.log("Has raw untranslated keys on Step 2:", hasRawKeys);

  await page.screenshot({ path: "scratch/step2.png" });

  // Fill in candidate details
  console.log("Filling Step 2 candidate details...");
  const nameInput = page.locator("input[placeholder*='Name'], input[placeholder*='नाम']").first();
  await nameInput.fill("Sudhir Pal");

  const dobInput = page.locator("input[type='date']").first();
  await dobInput.fill("1993-06-05");

  const heightInput = page.locator("input[type='number']").first();
  await heightInput.fill("171");

  const stateInput = page.locator("input[placeholder*='Pradesh'], input[placeholder*='प्रदेश']").first();
  await stateInput.fill("Uttar Pradesh");

  const cityInput = page.locator("input[placeholder*='Indore'], input[placeholder*='शहर']").first();
  await cityInput.fill("Kanpur");

  console.log("Clicking Next to proceed to Step 3...");
  const nextStep2Btn = page.locator("button:has-text('Next'), button:has-text('आगे')").last();
  await nextStep2Btn.click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: "scratch/step3.png" });
  console.log("Step 3 reached! Testing Phone OTP with test number...");

  const phoneInput = page.locator("input[type='tel']").first();
  await phoneInput.fill("9876543210");

  const sendCodeBtn = page.locator("button:has-text('Send Code'), button:has-text('कोड भेजें')").first();
  console.log("Clicking Send Code...");
  await sendCodeBtn.click();

  // Wait for OTP input or error
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "scratch/step3_after_send.png" });

  const bodyAfterSend = await page.innerText("body");
  console.log("Body snippet after send:", bodyAfterSend.slice(0, 500));

  await browser.close();
  console.log("Test run complete!");
}

runTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
