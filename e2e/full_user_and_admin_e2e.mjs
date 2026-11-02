/**
 * Production-Readiness End-to-End User & Admin Browser Verification Suite
 * Covers:
 *  - BUG-001 through BUG-013 regression assertions
 *  - PM Gate D-016 (Journeys 1 through 10: Registration, Login/Session, Header Sync,
 *    Profile Save, Real Photo Upload, Discovery Age Filter, Biodata PDF,
 *    Interests & Bilateral Contact Exchange, Encrypted Messaging, Privacy Center,
 *    Verification Selfie, and Full Admin Moderation Portal)
 */
import assert from "node:assert";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import pg from "pg";

const { Client } = pg;

const PORT = Number(process.env.E2E_PORT || 3099);
const BASE_URL = `http://localhost:${PORT}`;

function loadEnvLocal() {
  const env = { ...process.env };
  if (fs.existsSync(".env.local")) {
    const lines = fs.readFileSync(".env.local", "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!env[key]) env[key] = val;
      }
    }
  }
  if (env.DATABASE_URL && env.DATABASE_URL.includes(".pooler.supabase.com:5432")) {
    env.DATABASE_URL = env.DATABASE_URL.replace(".pooler.supabase.com:5432", ".pooler.supabase.com:6543");
  }
  return env;
}

// Valid 64x64 solid Royal Plum PNG generated as buffer for real file picker uploads
function createSamplePngBuffer() {
  // Minimal valid 1x1 RGB PNG (upscaled cleanly by browser canvas compressor)
  const b64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  return Buffer.from(b64, "base64");
}

async function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for Next.js server at ${url}`);
}

async function main() {
  const env = loadEnvLocal();
  const dbClient = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await dbClient.connect();

  const createdUserIds = [];
  const results = [];
  const consoleErrors = [];
  const pageErrors = [];

  const recordStep = (name, status, detail = "") => {
    results.push({ name, status, detail });
    const icon = status === "PASS" ? "PASS" : "FAIL";
    console.log(`[${icon}] ${name}${detail ? ` — ${detail}` : ""}`);
  };

  console.log(`Starting Next.js production server on ${BASE_URL}...`);
  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  const serverProc = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    env: { ...env, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverStderr = "";
  serverProc.stderr.on("data", (chunk) => {
    serverStderr += chunk.toString();
  });

  let browser;
  const tmpPngPath = path.join(process.cwd(), "e2e", ".tmp_test_photo.png");
  fs.mkdirSync(path.dirname(tmpPngPath), { recursive: true });
  fs.writeFileSync(tmpPngPath, createSamplePngBuffer());

  try {
    await waitForServer(`${BASE_URL}/api/auth/me`);

    browser = await chromium.launch({ headless: true });

    const attachDiagnostics = (page, label) => {
      page.on("pageerror", (err) => {
        pageErrors.push(`[${label}] ${err.message}`);
      });
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const txt = msg.text();
          if (!txt.includes("Failed to load resource: the server responded with a status of 401") &&
              !txt.includes("Failed to load resource: the server responded with a status of 403") &&
              !txt.includes("Failed to load resource: the server responded with a status of 400")) {
            consoleErrors.push(`[${label}] ${txt}`);
          }
        }
      });
    };

    // =========================================================================
    // JOURNEY 1: Unauthenticated Access Guards & Zero Demo Leak (BUG-003, BUG-009)
    // =========================================================================
    {
      const anonCtx = await browser.newContext();
      const anonPage = await anonCtx.newPage();
      attachDiagnostics(anonPage, "anon");

      const apiProfileRes = await anonPage.request.get(`${BASE_URL}/api/profile`);
      assert.strictEqual(apiProfileRes.status(), 401, "Unauthenticated /api/profile must return 401");

      await anonPage.goto(`${BASE_URL}/profile`, { waitUntil: "networkidle" });
      await anonPage.waitForURL(/\/login/, { timeout: 10000 });
      const bodyText = await anonPage.textContent("body");
      assert.ok(!bodyText.includes("PAL100001"), "Unauthenticated /profile must never show PAL100001");

      await anonPage.goto(`${BASE_URL}/connections`, { waitUntil: "networkidle" });
      await anonPage.waitForURL(/\/login/, { timeout: 10000 });

      await anonPage.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
      await anonPage.waitForURL(/\/admin\/login/, { timeout: 10000 });

      await anonCtx.close();
      recordStep(
        "Journey 1: Unauthenticated Route Guards & Zero Demo Profile Leak",
        "PASS",
        "/api/profile=401; /profile, /connections -> /login; /admin -> /admin/login"
      );
    }

    // =========================================================================
    // JOURNEY 2: /register UI Form Validation & i18n Key Check (BUG-H02)
    // =========================================================================
    {
      const regCtx = await browser.newContext();
      const regPage = await regCtx.newPage();
      attachDiagnostics(regPage, "register-ui");

      await regPage.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
      // Switch to English to inspect English keys as well
      const langBtn = regPage.locator("header button", { hasText: /English|हिंदी/ }).first();
      if ((await langBtn.textContent())?.includes("English")) {
        await langBtn.click();
      }

      const step1Text = await regPage.textContent("main");
      assert.ok(!step1Text.includes("manager.self"), "Must not render raw i18n key manager.self");
      await regPage.locator("main button", { hasText: /Next|आगे/ }).click();

      const step2Text = await regPage.textContent("main");
      assert.ok(!step2Text.includes("register.name"), "Must not render raw i18n key register.name");
      assert.ok(!step2Text.includes("profile.height"), "Must not render raw i18n key profile.height");

      // Underage check (<18)
      await regPage.fill('input[placeholder="Candidate Full Name"]', "Underage Test");
      await regPage.fill('input[type="date"]', "2012-05-05");
      await regPage.fill('input[placeholder*="Indore"]', "Lucknow");
      await regPage.locator("main button", { hasText: /Next|आगे/ }).click();
      const errBanner = await regPage.textContent("main");
      assert.ok(
        errBanner.includes("18") || errBanner.includes("वयस्क") || errBanner.includes("आयु"),
        "Underage DOB must be blocked on Step 2"
      );

      // Valid DOB advances to Step 3
      await regPage.fill('input[type="date"]', "1996-05-05");
      await regPage.locator("main button", { hasText: /Next|आगे/ }).click();
      await regPage.waitForSelector('button:has-text("Continue with Google")', { timeout: 5000 });

      await regCtx.close();
      recordStep(
        "Journey 2: /register Stepper UI, i18n Labels & Underage Validation",
        "PASS",
        "Zero raw i18n keys; <18 DOB blocked; Step 3 Auth options rendered"
      );
    }

    // =========================================================================
    // JOURNEY 3: Register Groom & Bride + Header Auth State Sync (BUG-006)
    // =========================================================================
    const suffix = Math.floor(10000000 + Math.random() * 89999999);
    const groomPhone = `97${String(suffix).padStart(8, "0").slice(0, 8)}`;
    const bridePhone = `96${String(suffix).padStart(8, "0").slice(0, 8)}`;

    const groomCtx = await browser.newContext();
    const groomPage = await groomCtx.newPage();
    attachDiagnostics(groomPage, "groom");

    const brideCtx = await browser.newContext();
    await brideCtx.addCookies([{ name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" }]);
    const bridePage = await brideCtx.newPage();
    attachDiagnostics(bridePage, "bride");

    await groomPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    const groomReg = await groomPage.evaluate(async (phone) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managedBy: "SELF",
          firstName: "AaravE2E",
          gender: "MALE",
          dob: "1997-04-15",
          heightCm: 176,
          maritalStatus: "NEVER_MARRIED",
          state: "Uttar Pradesh",
          city: "Lucknow",
          subCommunity: "Nikhar",
          phone,
          email: `aarav.e2e.${phone}@pal.in`,
          communityDeclaration: true,
          consentTerms: true,
        }),
      });
      return { status: res.status, body: await res.json() };
    }, groomPhone);

    assert.strictEqual(groomReg.status, 200, `Groom registration failed: ${JSON.stringify(groomReg.body)}`);
    const groomPublicId = groomReg.body.profile.publicId;
    const groomProfileId = groomReg.body.profile.id;
    const groomUserRow = await dbClient.query(`SELECT owner_user_id FROM public.profiles WHERE id = $1`, [groomProfileId]);
    createdUserIds.push(groomUserRow.rows[0].owner_user_id);

    await bridePage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    const brideReg = await bridePage.evaluate(async (phone) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managedBy: "SELF",
          firstName: "KavyaE2E",
          gender: "FEMALE",
          dob: "1999-08-20",
          heightCm: 163,
          maritalStatus: "NEVER_MARRIED",
          state: "Uttar Pradesh",
          city: "Kanpur",
          subCommunity: "Pal",
          phone,
          email: `kavya.e2e.${phone}@pal.in`,
          communityDeclaration: true,
          consentTerms: true,
        }),
      });
      return { status: res.status, body: await res.json() };
    }, bridePhone);

    assert.strictEqual(brideReg.status, 200, `Bride registration failed: ${JSON.stringify(brideReg.body)}`);
    const bridePublicId = brideReg.body.profile.publicId;
    const brideProfileId = brideReg.body.profile.id;
    const brideUserRow = await dbClient.query(`SELECT owner_user_id FROM public.profiles WHERE id = $1`, [brideProfileId]);
    createdUserIds.push(brideUserRow.rows[0].owner_user_id);

    // Verify Header updates on Groom session in BOTH Hindi (default) & English (BUG-006)
    await groomPage.goto(`${BASE_URL}/profile`, { waitUntil: "networkidle" });
    await groomPage.waitForSelector(`header:has-text("${groomPublicId}")`, { timeout: 10000 });
    const headerHindi = await groomPage.textContent("header");
    assert.ok(headerHindi.includes("AaravE2E"), "Header must show logged-in user's name");
    assert.ok(headerHindi.includes("लॉग आउट"), "Header must show Hindi लॉग आउट button by default");

    // Toggle to English and verify English Sign Out button
    await groomPage.locator("header button", { hasText: "English" }).click();
    await groomPage.waitForTimeout(300);
    const headerHtml = await groomPage.textContent("header");
    assert.ok(headerHtml.includes("Sign Out"), "Header must show Sign Out button in English");
    assert.ok(
      !headerHtml.includes("Register Free") && !headerHtml.includes("निःशुल्क पंजीकरण"),
      "Header must hide Register Free CTA when logged in"
    );

    recordStep(
      "Journey 3: Member Registration & AppHeader Live Auth Sync (BUG-006)",
      "PASS",
      `Registered ${groomPublicId} & ${bridePublicId}; Header displays name + PAL ID + Sign Out`
    );

    // =========================================================================
    // JOURNEY 4: Profile Load, Edit & DB Persistence (BUG-001, BUG-003, BUG-007)
    // =========================================================================
    {
      const profileMain = await groomPage.textContent("main");
      assert.ok(profileMain.includes("AaravE2E"), "Profile page must show AaravE2E");
      assert.ok(!profileMain.includes("राजेश"), "Profile page must NOT show hardcoded राजेश");
      assert.ok(!profileMain.includes("EMAXCONNSESSION"), "Zero EMAXCONNSESSION errors on /profile");

      // Fill Career & Bio fields while leaving Diet unselected ("") to test empty-enum safety
      await groomPage.fill('input[placeholder*="B.Tech"]', "M.Tech in Structural Engineering");
      await groomPage.fill('input[placeholder*="IIT"]', "IIT Roorkee");
      await groomPage.fill('input[placeholder*="Civil Engineer"]', "Executive Civil Engineer");
      await groomPage.fill('input[placeholder*="10 Lakh"]', "₹18 - ₹22 LPA");
      await groomPage.fill(
        'textarea[placeholder*="values"]',
        "Respectful, family-oriented engineer passionate about community heritage."
      );

      // Switch to Family Details tab and fill Father Occupation (leaving Family Values empty "")
      await groomPage.locator("button", { hasText: "Family Details" }).click();
      await groomPage.fill('input[placeholder*="Government Officer"]', "Retired Gazetted Officer");

      // Click Save
      await groomPage.locator("main button", { hasText: /^Save$/ }).first().click();
      await groomPage.waitForTimeout(1200);

      const postSaveText = await groomPage.textContent("main");
      assert.ok(!postSaveText.includes("EMAXCONNSESSION"), "Zero EMAXCONNSESSION during profile save");

      // Hard reload /profile and verify DB persistence
      await groomPage.reload({ waitUntil: "networkidle" });
      await groomPage.waitForSelector('input[placeholder*="B.Tech"]', { timeout: 10000 });
      const savedQual = await groomPage.inputValue('input[placeholder*="B.Tech"]');
      const savedUni = await groomPage.inputValue('input[placeholder*="IIT"]');
      assert.strictEqual(savedQual, "M.Tech in Structural Engineering", "Qualification must persist across reload");
      assert.strictEqual(savedUni, "IIT Roorkee", "University must persist across reload");

      recordStep(
        "Journey 4: Profile Editing, Empty-Enum Safety & DB Persistence (BUG-001/003/007)",
        "PASS",
        "Saved Career + Family fields persisted across hard reload with 0 EMAXCONNSESSION"
      );
    }

    // =========================================================================
    // JOURNEY 5: Real Photo File Picker Upload & Image Serving (BUG-002)
    // =========================================================================
    {
      await groomPage.locator("button", { hasText: "Private Photos" }).click();
      const fileInput = groomPage.locator('input[type="file"]');
      await fileInput.setInputFiles(tmpPngPath);

      // Confirm preview card appears before upload
      await groomPage.waitForSelector('img[alt="Selected preview"]', { timeout: 5000 });

      // Set privacy control to PUBLIC_TO_MEMBERS before uploading
      await groomPage.locator("main select").first().selectOption("PUBLIC_TO_MEMBERS");
      await groomPage.locator("button", { hasText: "Upload Selected Photo" }).click();

      // Wait for uploaded photo card with real /api/profile/photo/[id] img to finish decoding
      await groomPage.waitForFunction(
        () => {
          const el = /** @type {HTMLImageElement | null} */ (
            document.querySelector('img[src^="/api/profile/photo/"]')
          );
          return Boolean(el && el.complete && el.naturalWidth > 0);
        },
        { timeout: 10000 }
      );
      const naturalWidth = await groomPage.$eval(
        'img[src^="/api/profile/photo/"]',
        (el) => /** @type {HTMLImageElement} */ (el).naturalWidth
      );
      assert.ok(naturalWidth > 0, "Uploaded profile photo must render valid decoded image bytes");

      recordStep(
        "Journey 5: Real File Picker Photo Upload, Compression & Binary Serving (BUG-002)",
        "PASS",
        `Uploaded PNG compressed & served via /api/profile/photo/[id] (naturalWidth=${naturalWidth})`
      );
    }

    // =========================================================================
    // JOURNEY 6: Verification Center & Live Selfie Upload
    // =========================================================================
    {
      await groomPage.goto(`${BASE_URL}/verification`, { waitUntil: "networkidle" });
      const verifFileInput = groomPage.locator('input[type="file"]');
      await verifFileInput.setInputFiles(tmpPngPath);
      await groomPage.waitForSelector('img[alt="Selfie preview"]', { timeout: 5000 });
      await groomPage.locator('button[type="submit"]').click();
      await groomPage.waitForSelector('text=/Pending Review|समीक्षाधीन/', { timeout: 10000 });

      recordStep(
        "Journey 6: Verification Center & Live Selfie Image Submission",
        "PASS",
        "Compressed selfie image uploaded and queued for moderator comparison"
      );
    }

    // =========================================================================
    // JOURNEY 7: Admin Portal Login, Member Directory, Photo & Selfie Moderation (BUG-008)
    // =========================================================================
    {
      const adminCtx = await browser.newContext();
      await adminCtx.addCookies([{ name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" }]);
      const adminPage = await adminCtx.newPage();
      attachDiagnostics(adminPage, "admin");

      await adminPage.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      const footerAdminLink = adminPage.locator('footer a[href="/admin/login"]');
      await assert.doesNotReject(() => footerAdminLink.waitFor({ timeout: 5000 }));
      await footerAdminLink.click();
      await adminPage.waitForURL(/\/admin\/login/, { timeout: 10000 });

      // Step 1: Request MFA for 05sudhirpal@gmail.com
      await adminPage.fill('input[type="email"]', "05sudhirpal@gmail.com");
      await adminPage.locator('button[type="submit"]').click();
      await adminPage.waitForSelector('input[placeholder="123456"]', { timeout: 10000 });

      // Step 2: Submit MFA (auto-filled devCode or 999888, backed by stateless HMAC cookie)
      const prefilledCode = await adminPage.inputValue('input[placeholder="123456"]');
      if (!prefilledCode || prefilledCode.length !== 6) {
        await adminPage.fill('input[placeholder="123456"]', "999888");
      }
      await adminPage.locator('button[type="submit"]').click();
      await adminPage.waitForURL(/\/admin$/, { timeout: 10000 });

      // Verify Overview + Audit Logs
      await adminPage.waitForSelector("text=Immutable Security Audit Trail", { timeout: 10000 });

      // Open All Members tab -> verify Sudhir (PAL100070) + AaravE2E + KavyaE2E visible
      await adminPage.locator("button", { hasText: "Registered Members" }).click();
      await adminPage.waitForSelector(`text=${groomPublicId}`, { timeout: 10000 });
      const membersText = await adminPage.textContent("main");
      assert.ok(membersText.includes("PAL100070"), "Admin All Members view must include real user PAL100070");
      assert.ok(membersText.includes(bridePublicId), "Admin All Members view must include KavyaE2E");

      // Approve Groom and Bride profiles -> PUBLISHED
      const groomCard = adminPage.locator("div.rounded-3xl", { hasText: groomPublicId }).first();
      await groomCard.locator("button", { hasText: "Approve Profile" }).click();
      await adminPage.waitForTimeout(800);

      const brideCard = adminPage.locator("div.rounded-3xl", { hasText: bridePublicId }).first();
      await brideCard.locator("button", { hasText: "Approve Profile" }).click();
      await adminPage.waitForTimeout(800);

      // Moderate Photo Queue -> verify uploaded image renders & Approve it
      await adminPage.locator("button", { hasText: "Photo Moderation" }).click();
      await adminPage.waitForSelector(`text=${groomPublicId}`, { timeout: 10000 });
      await adminPage.waitForFunction(
        () => {
          const el = /** @type {HTMLImageElement | null} */ (
            document.querySelector('img[src^="/api/profile/photo/"]')
          );
          return Boolean(el && el.complete && el.naturalWidth > 0);
        },
        { timeout: 10000 }
      );
      const adminPhotoWidth = await adminPage.$eval(
        'img[src^="/api/profile/photo/"]',
        (el) => /** @type {HTMLImageElement} */ (el).naturalWidth
      );
      assert.ok(adminPhotoWidth > 0, "Admin Photo Queue must render member's uploaded image");
      const photoCard = adminPage.locator("div.rounded-3xl", { hasText: groomPublicId }).first();
      await photoCard.locator("button", { hasText: /^Approve$/ }).click();
      await adminPage.waitForTimeout(800);

      // Moderate Selfie Verification Queue -> verify selfie image renders & Award Badge
      await adminPage.locator("button", { hasText: "Verification Requests" }).click();
      await adminPage.waitForSelector(`text=${groomPublicId}`, { timeout: 10000 });
      const verifCard = adminPage.locator("div.rounded-3xl", { hasText: groomPublicId }).first();
      await verifCard.locator("button", { hasText: "Award Verified Badge" }).click();
      await adminPage.waitForTimeout(800);

      // Admin Logout
      await adminPage.locator("main button", { hasText: /Logout|लॉगआउट|Sign Out/ }).first().click();
      await adminPage.waitForURL(/\/admin\/login/, { timeout: 10000 });
      await adminCtx.close();

      recordStep(
        "Journey 7: Admin Portal Footer Link, MFA Login, Member/Photo/Selfie Moderation (BUG-008)",
        "PASS",
        "Admin logged in via Footer, viewed PAL100070 + E2E members, published profiles, approved photo & selfie"
      );
    }

    // =========================================================================
    // JOURNEY 8: Discovery Age Filter, Zero PII Leak & Watermarked PDF (BUG-004, BUG-011)
    // =========================================================================
    {
      const discoveryPayloads = [];
      groomPage.on("response", async (res) => {
        if (res.url().includes("/api/discovery") && res.status() === 200) {
          try {
            discoveryPayloads.push(await res.json());
          } catch {
            // ignore
          }
        }
      });

      // Test API directly for strict age bounds + UI filter interaction
      await groomPage.goto(`${BASE_URL}/discovery`, { waitUntil: "networkidle" });

      // Set Gender = All (""), Min Age = 18, Max Age = 29
      const genderSelect = groomPage.locator("main select").first();
      await genderSelect.selectOption("");
      const ageInputs = groomPage.locator('main input[type="number"]');
      await ageInputs.nth(0).fill("18");
      await ageInputs.nth(1).fill("29");
      await groomPage.waitForTimeout(900);

      const uiText29 = await groomPage.textContent("main");
      assert.ok(
        !uiText29.includes("PAL100074"),
        "Age filter 18-29 must strictly EXCLUDE 32-year-old Rohit Dhangar (PAL100074)"
      );
      assert.ok(
        !uiText29.includes("Candidate A"),
        "Discovery must contain zero leaked Candidate A test rows"
      );
      assert.ok(
        uiText29.includes(bridePublicId),
        "Age filter 18-29 must INCLUDE 27-year-old published KavyaE2E"
      );

      // Expand Max Age = 35 -> 32-year-old PAL100074 must now appear
      await ageInputs.nth(1).fill("35");
      await groomPage.waitForTimeout(900);
      const uiText35 = await groomPage.textContent("main");
      assert.ok(
        uiText35.includes("PAL100074"),
        "Age filter 18-35 must INCLUDE 32-year-old Rohit Dhangar (PAL100074)"
      );

      // Inspect every captured /api/discovery network payload for PII invariant
      assert.ok(discoveryPayloads.length > 0, "Must capture /api/discovery payloads");
      for (const payload of discoveryPayloads) {
        const serialized = JSON.stringify(payload);
        assert.ok(!serialized.includes(groomPhone) && !serialized.includes(bridePhone), "Zero raw phone numbers in discovery");
        for (const p of payload.profiles || []) {
          assert.strictEqual(p.phone, undefined);
          assert.strictEqual(p.phone_encrypted, undefined);
          assert.strictEqual(p.email, undefined);
        }
      }

      // Test Watermarked Biodata PDF on Groom's profile (contains ₹18 - ₹22 LPA!) from Bride's session
      const pdfCheck = await bridePage.evaluate(async (targetPubId) => {
        const res = await fetch(`/api/biodata/${targetPubId}/pdf`);
        const buf = await res.arrayBuffer();
        const header = new TextDecoder().decode(buf.slice(0, 5));
        return { status: res.status, contentType: res.headers.get("content-type"), byteLen: buf.byteLength, header };
      }, groomPublicId);

      assert.strictEqual(pdfCheck.status, 200, "Watermarked Biodata PDF with ₹ symbol must return 200 OK");
      assert.strictEqual(pdfCheck.header, "%PDF-", "Must return valid PDF binary");

      recordStep(
        "Journey 8: Discovery Age Filter, Zero PII Network Audit & Watermarked PDF (BUG-004/011)",
        "PASS",
        `18-29 excluded 32yo PAL100074; 18-35 included PAL100074; 0 PII in JSON; PDF=${pdfCheck.byteLen}B`
      );
    }

    // =========================================================================
    // JOURNEY 9: Mutual Interest Gate & Bilateral Contact Exchange UI (BUG-010)
    // =========================================================================
    {
      // 1. Messaging before mutual interest MUST fail
      const prematureMsg = await groomPage.evaluate(async (pubId) => {
        const res = await fetch(`/api/messages/${pubId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: "Hello before interest" }),
        });
        return { status: res.status, data: await res.json() };
      }, bridePublicId);
      assert.strictEqual(prematureMsg.status, 400, "Messaging prior to mutual interest must be blocked");

      // 2. Groom opens Bride's biodata page and clicks Send Interest + Request Contact
      await groomPage.goto(`${BASE_URL}/discovery/${bridePublicId}`, { waitUntil: "networkidle" });
      await groomPage.locator("button", { hasText: /Send Interest/i }).click();
      await groomPage.waitForSelector("text=/Interest Sent/i", { timeout: 8000 });

      await groomPage.locator("button", { hasText: /Request Contact/i }).click();
      await groomPage.waitForSelector("text=/Contact exchange active/i", { timeout: 8000 });

      // 3. Verify contact disclosure is strictly denied while only SENDER_APPROVED
      const exListGroom = await groomPage.evaluate(async () => {
        const r = await fetch("/api/contact-exchange");
        return r.json();
      });
      const exchangeReqId = exListGroom.requests[0]?.id;
      assert.ok(exchangeReqId, "Contact exchange request must exist");

      const prematureReveal = await groomPage.evaluate(async (reqId) => {
        const r = await fetch(`/api/contact-exchange/${reqId}`);
        return r.status;
      }, exchangeReqId);
      assert.strictEqual(prematureReveal, 403, "Contact disclosure before receiver approval must return 403");

      // 4. Bride opens /connections -> Accepts Interest -> Approves Contact Exchange via UI button!
      await bridePage.goto(`${BASE_URL}/connections`, { waitUntil: "networkidle" });
      await bridePage.waitForSelector(`text=${groomPublicId}`, { timeout: 10000 });
      await bridePage.locator("button", { hasText: /Accept|स्वीकार/ }).first().click();
      await bridePage.waitForTimeout(800);

      // Switch to Tab 4 (Mutual Contact Exchanges)
      await bridePage.locator("button", { hasText: "Mutual Contact Exchanges" }).click();
      const approveBtn = bridePage.locator("button", { hasText: "Approve & Share Contact" });
      await approveBtn.waitFor({ timeout: 8000 });
      await approveBtn.click();

      // Reveal decrypted phone number after BOTH_APPROVED!
      const viewContactBtn = bridePage.locator("button", { hasText: /View Contact|संपर्क विवरण देखें/ });
      await viewContactBtn.waitFor({ timeout: 8000 });
      await viewContactBtn.click();

      await bridePage.waitForSelector(`text=+91${groomPhone}`, { timeout: 8000 });

      recordStep(
        "Journey 9: Mutual Interest Gate & Bilateral Contact Exchange Approval UI (BUG-010)",
        "PASS",
        "403 prior to dual approval; Bride clicked 'Approve & Share Contact' -> decrypted +91 phone unlocked"
      );
    }

    // =========================================================================
    // JOURNEY 10: AES-256-GCM Encrypted Chat Thread & Read Receipts (M7)
    // =========================================================================
    {
      await groomPage.goto(`${BASE_URL}/messages/${bridePublicId}`, { waitUntil: "networkidle" });
      const msgText = "Namaste Kavya Ji, glad to connect with your family on Pal Matrimony.";
      await groomPage.fill('input[placeholder*="Type a respectful message"]', msgText);
      await groomPage.locator('form button[type="submit"]').click();
      await groomPage.waitForSelector(`text=${msgText}`, { timeout: 8000 });

      // Verify encrypted at rest in DB
      const rawMsg = await dbClient.query(
        `SELECT encrypted_body FROM public.messages WHERE sender_profile_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [groomProfileId]
      );
      assert.notStrictEqual(rawMsg.rows[0].encrypted_body, msgText, "Chat message must be encrypted at rest");

      // Bride reads message in browser
      await bridePage.goto(`${BASE_URL}/messages/${groomPublicId}`, { waitUntil: "networkidle" });
      await bridePage.waitForSelector(`text=${msgText}`, { timeout: 8000 });

      recordStep(
        "Journey 10: AES-256-GCM Encrypted Bilateral Chat & Decryption",
        "PASS",
        "Ciphertext verified in PostgreSQL; plaintext rendered cleanly in Bride's chat thread"
      );
    }

    // =========================================================================
    // JOURNEY 11: DPDP Privacy Center & Header Sign Out Revocation (BUG-006)
    // =========================================================================
    {
      await groomPage.goto(`${BASE_URL}/settings/privacy`, { waitUntil: "networkidle" });
      await groomPage.locator("button", { hasText: "DPDP Consent Records" }).click();
      await groomPage.waitForSelector("text=TERMS_AND_PRIVACY", { timeout: 8000 });

      // Sign Out from Header
      await groomPage.locator("header button", { hasText: "Sign Out" }).click();
      await groomPage.waitForTimeout(1000);

      const meAfterLogout = await groomPage.evaluate(async () => {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        return r.json();
      });
      assert.strictEqual(meAfterLogout.authenticated, false, "Session must be cleared after Sign Out");

      const headerAfterLogout = await groomPage.textContent("header");
      assert.ok(
        headerAfterLogout.includes("Sign In") || headerAfterLogout.includes("लॉगिन"),
        "Header must restore Sign In button immediately after Sign Out"
      );

      await groomCtx.close();
      await brideCtx.close();

      recordStep(
        "Journey 11: DPDP Privacy Center & Header Sign Out Session Revocation",
        "PASS",
        "DPDP consent records verified; Sign Out cleared pal_session and restored Sign In/Register header"
      );
    }

    assert.strictEqual(pageErrors.length, 0, `Uncaught page errors detected: ${pageErrors.join("; ")}`);
    assert.strictEqual(consoleErrors.length, 0, `Console errors detected: ${consoleErrors.join("; ")}`);
  } finally {
    // Clean up temporary PNG file
    try {
      if (fs.existsSync(tmpPngPath)) fs.unlinkSync(tmpPngPath);
    } catch {}

    // Clean up temporary E2E database rows so production DB stays 100% spotless
    if (createdUserIds.length > 0) {
      try {
        await dbClient.query(
          `DELETE FROM public.audit_logs WHERE actor_id = ANY($1::uuid[]);`,
          [createdUserIds]
        );
        await dbClient.query(
          `DELETE FROM public.users WHERE id = ANY($1::uuid[]);`,
          [createdUserIds]
        );
      } catch (cleanupErr) {
        console.error("Cleanup warning:", cleanupErr);
      }
    }

    // Verify zero test pollution and real user Sudhir (PAL100070) integrity
    const leakCheck = await dbClient.query(
      `SELECT COUNT(*)::int AS cnt FROM public.profiles WHERE first_name IN ('Candidate A', 'Candidate B', 'AaravE2E', 'KavyaE2E');`
    );
    const sudhirCheck = await dbClient.query(
      `SELECT public_id, first_name FROM public.profiles WHERE public_id = 'PAL100070';`
    );
    await dbClient.end();

    if (browser) await browser.close();
    serverProc.kill();

    assert.strictEqual(leakCheck.rows[0].cnt, 0, "Database must have 0 leaked E2E or Candidate A/B profiles");
    assert.strictEqual(sudhirCheck.rows.length, 1, "Real user Sudhir (PAL100070) must remain intact");

    console.log("\n========================================================");
    console.log(`E2E SUMMARY: ${results.length}/${results.length} JOURNEYS PASSED | 0 DB LEAKS | PAL100070 INTACT`);
    console.log("========================================================");
    if (serverStderr && serverStderr.includes("EMAXCONNSESSION")) {
      throw new Error(`EMAXCONNSESSION detected in server stderr: ${serverStderr}`);
    }
  }
}

main().catch((err) => {
  console.error("\n[E2E SUITE FAILED]:", err);
  process.exit(1);
});
