import { test, expect } from "@playwright/test";
import { memberCookie } from "./helpers.mjs";

// Privacy invariants (D-001/D-016): zero phone/email exposure in discovery/profile
// payloads; genuinely-protected endpoints reject unauthenticated callers.
test.describe("Privacy invariants enforced in API responses", () => {
  test("GET /api/discovery returns profiles with NO phone/email fields", async ({ request }) => {
    const res = await request.get("/api/discovery");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const profiles = Array.isArray(body) ? body : (body.profiles ?? []);
    expect(Array.isArray(profiles)).toBeTruthy();
    expect(profiles.length).toBeGreaterThan(0);

    for (const p of profiles) {
      const keys = Object.keys(p).join(",").toLowerCase();
      expect(keys).not.toContain("phone");
      expect(keys).not.toContain("mobile");
      expect(keys).not.toContain("email");
    }
  });

  test("GET /api/profile (incl. demo seed) returns NO phone/email fields", async ({ request }) => {
    const res = await request.get("/api/profile");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const profile = body.profile ?? body;
    const keys = Object.keys(profile).join(",").toLowerCase();
    expect(keys).not.toContain("phone");
    expect(keys).not.toContain("mobile");
    expect(keys).not.toContain("email");
  });

  test("Protected /api/messages/conversations requires session", async ({ request }) => {
    const res = await request.get("/api/messages/conversations");
    expect(res.status()).toBeGreaterThanOrEqual(401);
  });

  test("Protected /api/reports (POST) requires session", async ({ request }) => {
    const res = await request.post("/api/reports", {
      data: { reportedPublicId: "PAL000000", category: "SPAM", details: "e2e" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(401);
  });

  test("Minted valid session cookie is accepted by a protected endpoint", async ({ request }) => {
    const cookie = memberCookie();
    const res = await request.get("/api/messages/conversations", {
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    });
    // Reaching the handler (200/404-vs-401) proves session accepted.
    expect(res.status()).not.toBeGreaterThanOrEqual(401);
  });
});
