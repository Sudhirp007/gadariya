import crypto from "crypto";
import fs from "fs";

function loadEnvKeys() {
  if (!process.env.ENCRYPTION_MASTER_KEY || !process.env.PHONE_PEPPER_KEY) {
    try {
      if (fs.existsSync(".env.local")) {
        const lines = fs.readFileSync(".env.local", "utf-8").split("\n");
        for (const line of lines) {
          if (line.startsWith("ENCRYPTION_MASTER_KEY=")) {
            process.env.ENCRYPTION_MASTER_KEY = line.slice("ENCRYPTION_MASTER_KEY=".length).trim();
          }
          if (line.startsWith("PHONE_PEPPER_KEY=")) {
            process.env.PHONE_PEPPER_KEY = line.slice("PHONE_PEPPER_KEY=".length).trim();
          }
        }
      }
    } catch {
      // ignore
    }
  }
}
loadEnvKeys();

/**
 * Pal Matrimony Cryptographic & Privacy Utilities
 * Implements field-level encryption (AES-256-GCM) and blind indexing (HMAC-SHA256)
 * as mandated by SECURITY_WORKFLOW.md and PRD §13.
 */

// Master key for field-level encryption (AES-256-GCM requires 32 bytes)
function getMasterKey(): Buffer {
  const hex = process.env.ENCRYPTION_MASTER_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_MASTER_KEY must be configured as a 64-character (32-byte) hex string."
    );
  }
  return Buffer.from(hex, "hex");
}

// Pepper key for blind indexing (HMAC-SHA256 requires 32 bytes)
function getPepperKey(): Buffer {
  const hex = process.env.PHONE_PEPPER_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "PHONE_PEPPER_KEY must be configured as a 64-character (32-byte) hex string."
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Normalizes phone numbers to standard format (e.g. +91XXXXXXXXXX)
 * Removes spaces, dashes, parentheses.
 */
export function normalizePhoneNumber(rawPhone: string, defaultCountryCode = "+91"): string {
  if (!rawPhone) return "";
  let cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, "");
  if (!cleaned.startsWith("+")) {
    // If 10 digits (India standard), prefix with default country code
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

/**
 * Generates an HMAC-SHA256 blind index hash for duplicate detection.
 * The raw phone number is never queryable in plaintext.
 */
export function hashPhoneNumber(normalizedPhone: string): string {
  const pepper = getPepperKey();
  return crypto.createHmac("sha256", pepper).update(normalizedPhone).digest("hex");
}

export interface EncryptedPayload {
  ciphertext: string; // Base64
  iv: string;         // Base64 (12 bytes for GCM)
  tag: string;        // Base64 (16 bytes auth tag)
}

/**
 * Encrypts sensitive string data using AES-256-GCM with authenticated tag.
 */
export function encryptData(plaintext: string): EncryptedPayload {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12); // Recommended 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");
  const tag = cipher.getAuthTag().toString("base64");

  return {
    ciphertext,
    iv: iv.toString("base64"),
    tag,
  };
}

/**
 * Decrypts AES-256-GCM encrypted payload, verifying authentication tag.
 * Supports both { ciphertext, iv, tag } object or (ciphertext, iv, tag) arguments.
 */
export function decryptData(
  payloadOrCiphertext: EncryptedPayload | string,
  ivArg?: string,
  tagArg?: string
): string {
  const masterKey = getMasterKey();
  let ciphertext: string;
  let ivStr: string;
  let tagStr: string;

  if (typeof payloadOrCiphertext === "object" && payloadOrCiphertext !== null) {
    ciphertext = payloadOrCiphertext.ciphertext;
    ivStr = payloadOrCiphertext.iv;
    tagStr = payloadOrCiphertext.tag;
  } else {
    ciphertext = payloadOrCiphertext;
    ivStr = ivArg || "";
    tagStr = tagArg || "";
  }

  // Handle both base64 and hex encodings
  const ivEncoding: BufferEncoding = ivStr.length === 24 && !ivStr.includes("=") ? "hex" : "base64";
  const tagEncoding: BufferEncoding = tagStr.length === 32 && !tagStr.includes("=") ? "hex" : "base64";

  const iv = Buffer.from(ivStr, ivEncoding);
  const tag = Buffer.from(tagStr, tagEncoding);

  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(ciphertext, "base64", "utf8");
  plaintext += decipher.final("utf8");
  return plaintext;
}

/**
 * Calculates current age from date of birth string (YYYY-MM-DD).
 * Full DOB is never exposed in public APIs; only computed age is shared.
 */
export function calculateAge(dobString: string): number {
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Generates a public unique identifier in the format PAL######
 */
export function generatePublicId(sequenceNum: number): string {
  return `PAL${sequenceNum.toString().padStart(6, "0")}`;
}
