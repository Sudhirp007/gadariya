# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-privacy-invariants.spec.mjs >> Privacy invariants enforced in API responses >> Minted valid session cookie is accepted by a protected endpoint
- Location: e2e\02-privacy-invariants.spec.mjs:46:3

# Error details

```
Error: expect(received).not.toBeGreaterThanOrEqual(expected)

Expected: not >= 401
Received:        500
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { memberCookie } from "./helpers.mjs";
  3  | 
  4  | // Privacy invariants (D-001/D-016): zero phone/email exposure in discovery/profile
  5  | // payloads; genuinely-protected endpoints reject unauthenticated callers.
  6  | test.describe("Privacy invariants enforced in API responses", () => {
  7  |   test("GET /api/discovery returns profiles with NO phone/email fields", async ({ request }) => {
  8  |     const res = await request.get("/api/discovery");
  9  |     expect(res.ok()).toBeTruthy();
  10 |     const body = await res.json();
  11 |     const profiles = Array.isArray(body) ? body : (body.profiles ?? []);
  12 |     expect(Array.isArray(profiles)).toBeTruthy();
  13 |     expect(profiles.length).toBeGreaterThan(0);
  14 | 
  15 |     for (const p of profiles) {
  16 |       const keys = Object.keys(p).join(",").toLowerCase();
  17 |       expect(keys).not.toContain("phone");
  18 |       expect(keys).not.toContain("mobile");
  19 |       expect(keys).not.toContain("email");
  20 |     }
  21 |   });
  22 | 
  23 |   test("GET /api/profile (incl. demo seed) returns NO phone/email fields", async ({ request }) => {
  24 |     const res = await request.get("/api/profile");
  25 |     expect(res.ok()).toBeTruthy();
  26 |     const body = await res.json();
  27 |     const profile = body.profile ?? body;
  28 |     const keys = Object.keys(profile).join(",").toLowerCase();
  29 |     expect(keys).not.toContain("phone");
  30 |     expect(keys).not.toContain("mobile");
  31 |     expect(keys).not.toContain("email");
  32 |   });
  33 | 
  34 |   test("Protected /api/messages/conversations requires session", async ({ request }) => {
  35 |     const res = await request.get("/api/messages/conversations");
  36 |     expect(res.status()).toBeGreaterThanOrEqual(401);
  37 |   });
  38 | 
  39 |   test("Protected /api/reports (POST) requires session", async ({ request }) => {
  40 |     const res = await request.post("/api/reports", {
  41 |       data: { reportedPublicId: "PAL000000", category: "SPAM", details: "e2e" },
  42 |     });
  43 |     expect(res.status()).toBeGreaterThanOrEqual(401);
  44 |   });
  45 | 
  46 |   test("Minted valid session cookie is accepted by a protected endpoint", async ({ request }) => {
  47 |     const cookie = memberCookie();
  48 |     const res = await request.get("/api/messages/conversations", {
  49 |       headers: { cookie: `${cookie.name}=${cookie.value}` },
  50 |     });
  51 |     // Reaching the handler (200/404-vs-401) proves session accepted.
> 52 |     expect(res.status()).not.toBeGreaterThanOrEqual(401);
     |                              ^ Error: expect(received).not.toBeGreaterThanOrEqual(expected)
  53 |   });
  54 | });
  55 | 
```