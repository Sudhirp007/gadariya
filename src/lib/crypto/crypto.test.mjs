import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// Mock env keys for tests
process.env.ENCRYPTION_MASTER_KEY = "aae98b0b96aa732dfc9b941ef7ce75459de4cb48255200854f16149eab32bc05";
process.env.PHONE_PEPPER_KEY = "4f4b1699f43f10525dfd02f5f34a91e343a544dca1aa7e9b08330d4d3d54c81c";

// Implementation under test (ESM runner)
function normalizePhoneNumber(rawPhone, defaultCountryCode = "+91") {
  if (!rawPhone) return "";
  let cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, "");
  if (!cleaned.startsWith("+")) {
    if (/^\d{10}$/.test(cleaned)) {
      cleaned = `${defaultCountryCode}${cleaned}`;
    } else if (/^91\d{10}$/.test(cleaned)) {
      cleaned = `+${cleaned}`;
    } else {
      cleaned = `+${cleaned}`;
    }
  }
  return cleaned;
}

function hashPhoneNumber(normalizedPhone) {
  const pepper = Buffer.from(process.env.PHONE_PEPPER_KEY, "hex");
  return crypto.createHmac("sha256", pepper).update(normalizedPhone).digest("hex");
}

function encryptData(plaintext) {
  const masterKey = Buffer.from(process.env.ENCRYPTION_MASTER_KEY, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");
  const tag = cipher.getAuthTag().toString("base64");

  return { ciphertext, iv: iv.toString("base64"), tag };
}

function decryptData(payload) {
  const masterKey = Buffer.from(process.env.ENCRYPTION_MASTER_KEY, "hex");
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(payload.ciphertext, "base64", "utf8");
  plaintext += decipher.final("utf8");
  return plaintext;
}

function calculateAge(dobString) {
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function generatePublicId(sequenceNum) {
  return `PAL${sequenceNum.toString().padStart(6, "0")}`;
}

describe("Pal Matrimony Cryptography & Privacy Engine", () => {
  test("Phone normalization formats standard India numbers", () => {
    assert.equal(normalizePhoneNumber("9876543210"), "+919876543210");
    assert.equal(normalizePhoneNumber(" 98765 43210 "), "+919876543210");
    assert.equal(normalizePhoneNumber("9876-543-210"), "+919876543210");
    assert.equal(normalizePhoneNumber("+91 98765 43210"), "+919876543210");
    assert.equal(normalizePhoneNumber("+1 415 555 2671"), "+14155552671");
  });

  test("HMAC blind indexing produces deterministic 64-char hex hash", () => {
    const phone = "+919876543210";
    const hash1 = hashPhoneNumber(phone);
    const hash2 = hashPhoneNumber(phone);
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64);

    const diffPhone = "+919876543211";
    assert.notEqual(hashPhoneNumber(diffPhone), hash1);
  });

  test("AES-256-GCM encrypts and decrypts with authentication tag", () => {
    const secretPhone = "+919876543210";
    const encrypted = encryptData(secretPhone);

    assert.notEqual(encrypted.ciphertext, secretPhone);
    assert.ok(encrypted.iv);
    assert.ok(encrypted.tag);

    const decrypted = decryptData(encrypted);
    assert.equal(decrypted, secretPhone);
  });

  test("AES-256-GCM detects ciphertext tampering", () => {
    const encrypted = encryptData("secret message");
    const tampered = { ...encrypted, ciphertext: "dGFtcGVyZWQ=" };
    assert.throws(() => decryptData(tampered));
  });

  test("Age calculation correctly computes age and detects underage", () => {
    // 25 years ago
    const d25 = new Date();
    d25.setFullYear(d25.getFullYear() - 25);
    assert.equal(calculateAge(d25.toISOString().split("T")[0]), 25);

    // 17 years ago (underage)
    const d17 = new Date();
    d17.setFullYear(d17.getFullYear() - 17);
    const age17 = calculateAge(d17.toISOString().split("T")[0]);
    assert.equal(age17, 17);
    assert.ok(age17 < 18, "Underage detection must identify ages < 18");
  });

  test("Public ID format conforms to PAL######", () => {
    assert.equal(generatePublicId(1), "PAL000001");
    assert.equal(generatePublicId(42), "PAL000042");
    assert.equal(generatePublicId(10234), "PAL010234");
  });
});
