import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyFirebaseIdToken } from "@/lib/firebase/verify-token";
import { normalizePhoneNumber, hashPhoneNumber } from "@/lib/crypto";
import { db } from "@/lib/db";
import { attachSessionCookie } from "@/lib/auth/session";

const loginSchema = z.object({
  firebaseIdToken: z.string().min(10, "Valid Firebase ID token is required"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid login request", details: parsed.error.format() },
        { status: 400 }
      );
    }

    // 1. Verify token server-side via Google Identity Toolkit
    const verifiedUser = await verifyFirebaseIdToken(parsed.data.firebaseIdToken);

    let user: any = null;
    let phoneHash = "";

    // 2. Lookup by verified Phone Number (authoritative)
    if (verifiedUser.phoneNumber) {
      const normalizedPhone = normalizePhoneNumber(verifiedUser.phoneNumber);
      phoneHash = hashPhoneNumber(normalizedPhone);
      user = await db.findUserByPhoneHash(phoneHash);
    }

    // 3. Fallback: Lookup by verified Email (e.g., Google Provider)
    if (!user && verifiedUser.email) {
      const emailRes = await db.query(
        `SELECT * FROM public.users WHERE email = $1 LIMIT 1;`,
        [verifiedUser.email.toLowerCase()]
      );
      if (emailRes.rows.length > 0) {
        user = emailRes.rows[0];
        phoneHash = user.phone_lookup_hash;
      }
    }

    // 4. If account does not exist yet, instruct frontend to complete registration
    if (!user) {
      return NextResponse.json({
        success: false,
        notRegistered: true,
        message: "No profile found for this verified account. Please register your profile.",
        verifiedPhone: verifiedUser.phoneNumber || undefined,
        verifiedEmail: verifiedUser.email || undefined,
      });
    }

    // 5. Retrieve associated profile
    const profile = await db.getProfileByUserId(user.id);
    if (!profile) {
      return NextResponse.json({
        success: false,
        notRegistered: true,
        message: "User account exists but profile setup is pending. Please complete registration.",
        userId: user.id,
      });
    }

    // 6. Attach secure session cookie
    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully",
      profile: {
        id: profile.id,
        publicId: profile.public_id,
        firstName: profile.first_name,
        gender: profile.gender,
        publicationStatus: profile.publication_status,
      },
    });

    attachSessionCookie(response, {
      userId: user.id,
      profileId: profile.id,
      phoneHash,
      role: "MEMBER",
    });

    await db.logAuditEvent({
      actorId: user.id,
      action: "USER_LOGGED_IN_FIREBASE",
      targetType: "AUTH",
      metadata: { uid: verifiedUser.uid, phoneHash },
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Authentication error";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
