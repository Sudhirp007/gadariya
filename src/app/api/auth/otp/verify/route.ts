import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyStoredOtp } from "@/lib/auth/otp";
import { normalizePhoneNumber, hashPhoneNumber } from "@/lib/crypto";
import { db } from "@/lib/db";
import { attachSessionCookie } from "@/lib/auth/session";

const verifySchema = z.object({
  identifier: z.string().min(3),
  otp: z.string().length(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid OTP format" }, { status: 400 });
    }

    const { identifier, otp } = parsed.data;

    const isValid = verifyStoredOtp(identifier, otp);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP code. Please try again." },
        { status: 401 }
      );
    }

    // Lookup user in PostgreSQL
    const normalized = normalizePhoneNumber(identifier);
    const phoneHash = hashPhoneNumber(normalized);

    let user = await db.findUserByPhoneHash(phoneHash);
    let profile = user ? await db.getProfileByUserId(user.id) : null;

    // If user does not exist yet (first-time login via OTP), fallback to demo profile or require register
    let userId = user?.id;
    let profileId = profile?.id;

    if (!user || !profile) {
      // Use demo seed if exists, or return info asking to register
      profileId = await db.seedDemoProfileIfEmpty();
      const p = await db.getProfileById(profileId);
      userId = p?.owner_user_id || "00000000-0000-0000-0000-000000000001";
    }

    const response = NextResponse.json({
      success: true,
      message: "Authentication successful",
      user: {
        userId,
        profileId,
        publicId: profile?.public_id || "PAL100001",
      },
    });

    attachSessionCookie(response, {
      userId: userId!,
      profileId: profileId!,
      phoneHash,
      role: "MEMBER",
    });

    await db.logAuditEvent({
      actorId: userId,
      action: "USER_LOGGED_IN",
      targetType: "AUTH",
      metadata: { phoneHash },
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
