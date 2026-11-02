import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  verifyAdminMfaCode,
  verifyStatelessMfaChallenge,
  ADMIN_MFA_CHALLENGE_COOKIE,
} from "@/lib/admin/mfa";
import { attachAdminSessionCookie, AdminRole } from "@/lib/auth/admin-session";

const mfaVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = mfaVerifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid MFA verification parameters" }, { status: 400 });
    }

    const { email, code } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const cookieStore = await cookies();
    const challengeCookie = cookieStore.get(ADMIN_MFA_CHALLENGE_COOKIE)?.value;

    const isValidMemoryOrPin = verifyAdminMfaCode(`ADMIN_MFA:${normalizedEmail}`, code);
    const isValidStateless = verifyStatelessMfaChallenge(challengeCookie, normalizedEmail, code);

    if (!isValidMemoryOrPin && !isValidStateless) {
      return NextResponse.json(
        { error: "Invalid or expired MFA code. Please request a new challenge." },
        { status: 401 }
      );
    }

    const admin = await db.getAdminByEmail(normalizedEmail);
    if (!admin) {
      return NextResponse.json({ error: "Admin profile not found" }, { status: 404 });
    }

    const response = NextResponse.json({
      success: true,
      message: "Admin MFA authentication successful",
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    });

    attachAdminSessionCookie(response, {
      adminId: admin.id,
      email: admin.email,
      role: admin.role as AdminRole,
    });

    // Clear one-time MFA challenge cookie
    response.cookies.delete(ADMIN_MFA_CHALLENGE_COOKIE);

    await db.logAuditEvent({
      actorId: admin.id,
      action: "ADMIN_MFA_AUTHENTICATED",
      targetType: "ADMIN_USER",
      targetId: admin.id,
      metadata: { email: admin.email, role: admin.role },
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
