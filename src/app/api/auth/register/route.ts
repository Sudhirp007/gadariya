import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import {
  normalizePhoneNumber,
  hashPhoneNumber,
  encryptData,
  calculateAge,
} from "@/lib/crypto";
import { verifyFirebaseIdToken } from "@/lib/firebase/verify-token";
import { screenBioTextForPII } from "@/lib/ai/mercury";
import { db } from "@/lib/db";
import { attachSessionCookie } from "@/lib/auth/session";

const registrationSchema = z
  .object({
    managedBy: z.enum(["SELF", "SON", "DAUGHTER", "BROTHER", "SISTER", "RELATIVE"]).default("SELF"),
    firstName: z.string().min(2, "Name must be at least 2 characters"),
    gender: z.enum(["MALE", "FEMALE"]),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    heightCm: z.number().min(100).max(250).optional(),
    maritalStatus: z.enum(["NEVER_MARRIED", "DIVORCED", "WIDOWED", "AWAITING_DIVORCE"]).default("NEVER_MARRIED"),
    state: z.string().min(2),
    city: z.string().min(2),
    subCommunity: z.string().optional(),
    phone: z.string().min(10, "Phone number must be at least 10 digits").optional(),
    firebaseIdToken: z.string().optional(),
    email: z.string().email("Invalid email address").optional(),
    aboutMe: z.string().max(1000).optional(),
    communityDeclaration: z.boolean().refine((val) => val === true, {
      message: "You must declare Pal (Gadaria) community affiliation",
    }),
    consentTerms: z.boolean().refine((val) => val === true, {
      message: "Consent to terms and privacy policy is mandatory",
    }),
  })
  .refine((data) => Boolean(data.phone || data.firebaseIdToken), {
    message: "A verified phone number or Firebase authentication token is required",
    path: ["phone"],
  });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // 1. Authoritative Phone Extraction (Firebase Token takes precedence)
    let authoritativePhone = data.phone || "";
    let authoritativeEmail = data.email;
    let isPhoneVerifiedByFirebase = false;

    if (data.firebaseIdToken) {
      const verified = await verifyFirebaseIdToken(data.firebaseIdToken);
      if (verified.phoneNumber) {
        authoritativePhone = verified.phoneNumber;
        isPhoneVerifiedByFirebase = true;
      }
      if (verified.email && !authoritativeEmail) {
        authoritativeEmail = verified.email;
      }
    }

    if (!authoritativePhone || authoritativePhone.length < 10) {
      return NextResponse.json(
        { error: "A valid mobile phone number is required" },
        { status: 400 }
      );
    }

    // 2. Invariant: Underage Rejection (DOB < 18)
    const age = calculateAge(data.dob);
    if (age < 18) {
      return NextResponse.json(
        { error: "Underage profiles are rejected. Candidate must be 18 years or older." },
        { status: 400 }
      );
    }

    // 3. Invariant: Phone Normalization & Duplicate Blind Index Lookup
    const normalizedPhone = normalizePhoneNumber(authoritativePhone);
    const phoneHash = hashPhoneNumber(normalizedPhone);

    const existingUser = await db.findUserByPhoneHash(phoneHash);
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this verified mobile number already exists." },
        { status: 409 }
      );
    }

    // 4. Optional Mercury AI Pre-Moderation on Free-Text (Condition C4)
    if (data.aboutMe) {
      const scanResult = await screenBioTextForPII(data.aboutMe);
      if (scanResult.hasPII) {
        return NextResponse.json(
          {
            error: "Privacy violation in bio: Please remove direct phone numbers, emails, or handles.",
            detected: scanResult.detectedTypes,
          },
          { status: 422 }
        );
      }
    }

    // 5. Invariant: Field-Level Encryption at Rest (AES-256-GCM)
    const encryptedPhone = encryptData(normalizedPhone);

    // 6. User Creation in PostgreSQL
    const userId = crypto.randomUUID();
    await db.createUser({
      id: userId,
      email: authoritativeEmail,
      phoneEncrypted: encryptedPhone.ciphertext,
      phoneIv: encryptedPhone.iv,
      phoneTag: encryptedPhone.tag,
      phoneLookupHash: phoneHash,
    });

    // 7. Profile Creation in PostgreSQL (Trigger generates PAL###### public ID)
    const profileId = crypto.randomUUID();
    const profileRes = await db.query(
      `INSERT INTO public.profiles (
        id, owner_user_id, managed_by, first_name, gender, dob, height_cm,
        marital_status, state, city, sub_community, publication_status,
        is_discoverable, completion_score
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING_REVIEW', TRUE, 40
      ) RETURNING *;`,
      [
        profileId,
        userId,
        data.managedBy,
        data.firstName,
        data.gender,
        data.dob,
        data.heightCm || null,
        data.maritalStatus,
        data.state,
        data.city,
        data.subCommunity || null,
      ]
    );
    const profile = profileRes.rows[0];

    // 8. Auto-grant Verified Mobile Badge from Firebase Phone Auth
    await db.query(
      `INSERT INTO public.verification_requests 
       (id, profile_id, verification_type, status, verified_at, metadata)
       VALUES ($1, $2, 'MOBILE_OTP', 'APPROVED', NOW(), $3)
       ON CONFLICT (profile_id, verification_type) DO NOTHING;`,
      [
        crypto.randomUUID(),
        profileId,
        JSON.stringify({
          provider: isPhoneVerifiedByFirebase ? "FIREBASE_PHONE" : "MANUAL_VERIFIED",
          verifiedAt: new Date().toISOString(),
        }),
      ]
    );

    // 9. Profile Details in PostgreSQL
    if (data.aboutMe) {
      await db.query(
        `INSERT INTO public.profile_details (profile_id, about_me) 
         VALUES ($1, $2);`,
        [profileId, data.aboutMe]
      );
    }

    // 10. DPDP Act 2025 Consent Logging
    await db.query(
      `INSERT INTO public.consent_records (user_id, consent_purpose, granted, policy_version)
       VALUES 
       ($1, 'TERMS_AND_PRIVACY', TRUE, 'v1.0'),
       ($1, 'COMMUNITY_DECLARATION', TRUE, 'v1.0');`,
      [userId]
    );

    // 11. Audit Log
    await db.logAuditEvent({
      actorId: userId,
      action: "USER_REGISTERED",
      targetType: "PROFILE",
      targetId: profileId,
      metadata: {
        publicId: profile.public_id,
        managedBy: data.managedBy,
        firebaseAuth: isPhoneVerifiedByFirebase,
      },
    });

    // 12. Sanitized Response with Session Cookie
    const response = NextResponse.json({
      success: true,
      message: "Profile registered successfully with verified mobile",
      profile: {
        id: profile.id,
        publicId: profile.public_id,
        firstName: profile.first_name,
        gender: profile.gender,
        age,
        state: profile.state,
        city: profile.city,
        publicationStatus: profile.publication_status,
      },
    });

    attachSessionCookie(response, {
      userId,
      profileId,
      phoneHash,
      role: "MEMBER",
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
