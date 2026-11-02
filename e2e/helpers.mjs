import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSessionToken } from "../src/lib/auth/session.ts";

const SESSION_COOKIE_NAME = "pal_session"; // matches src/lib/auth/session.ts
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load ENCRYPTION_MASTER_KEY from .env.local so the minted token uses the SAME
// secret as the running production server (otherwise the server rejects it).
function loadMasterKeyFromDotEnv() {
  if (process.env.ENCRYPTION_MASTER_KEY) return;
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^\s*ENCRYPTION_MASTER_KEY\s*=\s*(.+)\s*$/);
    if (m) {
      process.env.ENCRYPTION_MASTER_KEY = m[1].trim();
      return;
    }
  }
}
loadMasterKeyFromDotEnv();

// Mint a valid signed session cookie exactly as the server would post-login.
export function memberCookie(payload = {}) {
  const token = createSessionToken({
    userId: payload.userId || "e2e-user-1",
    profileId: payload.profileId || "e2e-profile-1",
    phoneHash: payload.phoneHash || "e2e-phonehash-" + Date.now(),
    role: payload.role || "MEMBER",
  });
  return { name: SESSION_COOKIE_NAME, value: token, domain: "localhost", path: "/" };
}

export const TEST_PHONE_HASH = "e2e-phonehash-" + Date.now();
