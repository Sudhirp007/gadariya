import crypto from "crypto";

export interface SessionPayload {
  userId: string;
  profileId: string;
  phoneHash: string;
  role: "MEMBER" | "SUPER_ADMIN" | "MODERATOR" | "VERIFICATION_ADMIN" | "SUPPORT";
  exp: number; // Unix timestamp
}

const SESSION_COOKIE_NAME = "pal_session";
const SESSION_DURATION_SEC = 7 * 24 * 60 * 60; // 7 days

function getSecretKey(): Buffer {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (masterKey && masterKey.length >= 32) {
    return Buffer.from(masterKey.slice(0, 32), "utf-8");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SECURITY VIOLATION: ENCRYPTION_MASTER_KEY must be configured and >= 32 characters in production."
    );
  }
  return Buffer.from("pal_matrimony_fallback_secret_32b!", "utf-8");
}

export function createSessionToken(data: Omit<SessionPayload, "exp">): string {
  const payload: SessionPayload = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SEC,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecretKey())
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadB64, signature] = parts;

    const expectedSig = crypto
      .createHmac("sha256", getSecretKey())
      .update(payloadB64)
      .digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    );

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<SessionPayload | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export function attachSessionCookie(response: any, payload: Omit<SessionPayload, "exp">) {
  const token = createSessionToken(payload);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SEC,
    path: "/",
  });
  return token;
}

export function clearSessionCookie(response: any) {
  response.cookies.delete(SESSION_COOKIE_NAME);
}
