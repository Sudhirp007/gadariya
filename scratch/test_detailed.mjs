import { chromium } from "playwright";

async function runDetailedTest() {
  console.log("Starting detailed Playwright test...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", msg => console.log("CONSOLE:", msg.type(), msg.text()));
  page.on("pageerror", err => console.log("PAGEERROR:", err.message));

  page.on("requestfailed", req => {
    console.log("FAILED REQUEST:", req.url(), req.failure()?.errorText);
  });

  page.on("response", res => {
    if (res.url().includes("identitytoolkit") || res.url().includes("recaptcha")) {
      console.log("RESPONSE:", res.status(), res.url().slice(0, 80));
    }
  });

  await page.goto("https://gadariya-livid.vercel.app/register", { waitUntil: "networkidle" });

  // Step 1 -> Next
  const nextBtn = page.locator("button:has-text('Next'), button:has-text('आगे')").first();
  await nextBtn.click();
  await page.waitForTimeout(500);

  // Step 2 -> Fill & Next
  await page.locator("input[placeholder*='Name'], input[placeholder*='नाम']").first().fill("Sudhir Pal");
  await page.locator("input[type='date']").first().fill("1993-06-05");
  await page.locator("input[placeholder*='Pradesh'], input[placeholder*='प्रदेश']").first().fill("Uttar Pradesh");
  await page.locator("input[placeholder*='Indore'], input[placeholder*='शहर']").first().fill("Kanpur");
  await page.locator("button:has-text('Next'), button:has-text('आगे')").last().click();
  await page.waitForTimeout(500);

  // Step 3 -> Fill test phone and send code
  console.log("Filling test phone 9876543210...");
  await page.locator("input[type='tel']").first().fill("9876543210");
  
  const sendBtn = page.locator("button:has-text('Send Code'), button:has-text('कोड भेजें')").first();
  console.log("Clicking Send Code...");
  await sendBtn.click();

  // Wait up to 15s for the code box or error to appear
  for (let i = 1; i <= 15; i++) {
    await page.waitForTimeout(1000);
    const hasOtpInput = await page.locator("input[placeholder='123456']").isVisible().catch(() => false);
    const hasError = await page.locator(".bg-burgundy-50, .text-burgundy-900").isVisible().catch(() => false);
    if (hasOtpInput) {
      console.log(`Success! OTP box appeared at ${i}s!`);
      break;
    }
    if (hasError) {
      const errText = await page.locator(".bg-burgundy-50, .text-burgundy-900").innerText();
      console.log(`Error displayed at ${i}s:`, errText);
      break;
    }
    console.log(`Waiting... ${i}s`);
  }

  await page.screenshot({ path: "scratch/step3_result.png" });
  await browser.close();
}

runDetailedTest().catch(console.error);
