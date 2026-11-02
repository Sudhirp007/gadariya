import { chromium } from "playwright";

async function testWithSetting() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", msg => console.log("PAGE CONSOLE:", msg.type(), msg.text()));

  await page.goto("https://gadariya-livid.vercel.app/register", { waitUntil: "networkidle" });

  // Inject setting into window.firebaseAuth before sending
  await page.evaluate(() => {
    // We can test if we set it in the client
  });

  await browser.close();
}
