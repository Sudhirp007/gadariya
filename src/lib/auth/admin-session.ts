import crypto from "crypto";

export type AdminRole = "SUPER_ADMIN" | "MODERATOR" | "VERIFICATION_ADMIN" | "SUPPORT";

export interface AdminSessionPayload {
  adminId: string;
  email: string;
  role: AdminRole;
  exp: number;
}

const ADMIN_COOKIE_NAME = "pal_admin_session";
const ADMIN_SESSION_DURATION = 12 * 60 * 60; // 12 hours max for admin sessions

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
  return Buffer.from("pal_admin_fallback_dev_secret32!", "utf-8");
}

export function createAdminToken(data: Omit<AdminSessionPayload, "exp">): string {
  const payload: AdminSessionPayload = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_DURATION,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecretKey())
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

export function verifyAdminToken(token: string): AdminSessionPayload | null {
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

    const payload: AdminSessionPayload = JSON.parse(
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

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyAdminToken(token);
  } catch {
    return null;
  }
}

export function attachAdminSessionCookie(
  response: any,
  payload: Omit<AdminSessionPayload, "exp">
) {
  const token = createAdminToken(payload);
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ADMIN_SESSION_DURATION,
    path: "/",
  });
  return token;
}

export function clearAdminSessionCookie(response: any) {
  response.cookies.delete(ADMIN_COOKIE_NAME);
}
