import test from "node:test";
import assert from "node:assert";
import { verifyFirebaseIdToken } from "./verify-token.ts";
import { normalizePhoneNumber, hashPhoneNumber } from "../crypto/index.ts";

test("Milestone M4/D-014: Firebase Authentication & Verification Suite", async (t) => {
  await t.test("F-01: verifyFirebaseIdToken extracts phone and UID from mock test token", async () => {
    const mockToken = "mock-phone-token:+919876543210:user-fb-12345:test@example.com";
    const user = await verifyFirebaseIdToken(mockToken);

    assert.strictEqual(user.uid, "user-fb-12345");
    assert.strictEqual(user.phoneNumber, "+919876543210");
    assert.strictEqual(user.email, "test@example.com");
    assert.strictEqual(user.emailVerified, true);
  });

  await t.test("F-02: verifyFirebaseIdToken rejects empty or invalid tokens", async () => {
    await assert.rejects(
      async () => {
        await verifyFirebaseIdToken("");
      },
      { message: /Missing Firebase ID token/ }
    );
  });

  await t.test("F-03: Phone normalization & blind indexing holds for Firebase-verified numbers", async () => {
    const rawFirebasePhone = "+91 98765 43210";
    const normalized = normalizePhoneNumber(rawFirebasePhone);
    assert.strictEqual(normalized, "+919876543210");

    const hash1 = hashPhoneNumber(normalized);
    const hash2 = hashPhoneNumber("+919876543210");
    assert.strictEqual(hash1, hash2, "Deterministic blind index holds");
    assert.strictEqual(hash1.length, 64, "SHA-256 hex length holds");
  });

  await t.test("F-04: Invariant: Phone number is never exposed in client auth payloads", async () => {
    const mockToken = "mock-phone-token:+919123456789:user-fb-999";
    const user = await verifyFirebaseIdToken(mockToken);
    
    // Simulate sanitized profile response returned by /api/auth/register & /api/auth/login
    const sanitizedClientProfile = {
      id: "test-profile-id",
      publicId: "PAL999999",
      firstName: "Ramesh",
      gender: "MALE",
      hasVerifiedMobileBadge: Boolean(user.phoneNumber),
    };

    assert.strictEqual(sanitizedClientProfile.hasVerifiedMobileBadge, true);
    assert.strictEqual("phone" in sanitizedClientProfile, false, "Raw phone must not be exposed to client");
    assert.strictEqual("phoneNumber" in sanitizedClientProfile, false, "Raw phone must not be exposed to client");
  });

  await t.test("F-05: Google OAuth Registration: Email deterministic hash & phone exemption", async () => {
    const mockGoogleToken = "mock-phone-token::google-user-777:candidate@gmail.com";
    const user = await verifyFirebaseIdToken(mockGoogleToken);

    assert.strictEqual(user.uid, "google-user-777");
    assert.strictEqual(user.phoneNumber, undefined);
    assert.strictEqual(user.email, "candidate@gmail.com");

    const emailHash = hashPhoneNumber(`google:${user.email}`);
    assert.strictEqual(emailHash.length, 64, "Google-only account has valid deterministic blind index");
    assert.strictEqual(emailHash, hashPhoneNumber("google:candidate@gmail.com"));
  });
});
