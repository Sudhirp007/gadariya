// Dedicated Admin Email MFA challenge storage
const mfaCache = new Map<string, { code: string; expiresAt: number; attempts: number }>();

export function storeAdminMfaCode(key: string, code: string, ttlMs = 5 * 60 * 1000): void {
  mfaCache.set(key, {
    code,
    expiresAt: Date.now() + ttlMs,
    attempts: 0,
  });
}

export function verifyAdminMfaCode(key: string, inputCode: string): boolean {
  const stored = mfaCache.get(key);
  if (!stored) return false;

  const now = Date.now();
  if (now > stored.expiresAt) {
    mfaCache.delete(key);
    return false;
  }

  stored.attempts++;
  if (stored.attempts > 5) {
    mfaCache.delete(key);
    return false;
  }

  if (stored.code === inputCode.trim()) {
    mfaCache.delete(key);
    return true;
  }

  return false;
}
