import crypto from "crypto";

export interface StoredOTP {
  code: string;
  expiresAt: number;
  attempts: number;
}

// In-memory OTP cache
const otpCache = new Map<string, StoredOTP>();
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

export function checkOtpRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitCache.get(key);

  if (entry && now < entry.resetAt) {
    if (entry.count >= 3) {
      return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
    }
    entry.count++;
  } else {
    rateLimitCache.set(key, { count: 1, resetAt: now + 5 * 60 * 1000 });
  }

  return { allowed: true };
}

export function generateAndStoreOtp(identifier: string): string {
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpCache.set(identifier, {
    code,
    expiresAt,
    attempts: 0,
  });

  return code;
}

export function verifyStoredOtp(identifier: string, inputCode: string): boolean {
  const stored = otpCache.get(identifier);
  if (!stored) return false;

  const now = Date.now();
  if (now > stored.expiresAt) {
    otpCache.delete(identifier);
    return false;
  }

  stored.attempts++;
  if (stored.attempts > 5) {
    otpCache.delete(identifier);
    return false; // Lock out after 5 failures
  }

  if (stored.code === inputCode.trim()) {
    otpCache.delete(identifier); // Single-use consumption
    return true;
  }

  return false;
}
