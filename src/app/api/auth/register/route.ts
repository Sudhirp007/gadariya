import { NextResponse } from "next/server";
import { z } from "zod";
import {
  normalizePhoneNumber,
  hashPhoneNumber,
  encryptData,
  calculateAge,
  generatePublicId,
} from "@/lib/crypto";
import { screenBioTextForPII } from "@/lib/ai/mercury";

// In-memory registered user repository for local dev / staging test executions
// When remote Supabase credentials are provided, writes through to PostgreSQL
interface UserRecord {
  id: string;
  phone_lookup_hash: string;
  phone_encrypted: string;
  phone_iv: string;
  phone_tag: string;
  email?: string;
  created_at: string;
}

interface ProfileRecord {
  id: string;
  public_id: string;
  owner_user_id: string;
  first_name: string;
  gender: string;
  dob: string;
  age: number;
  height_cm?: number;
  marital_status: string;
  state: string;
  city: string;
  managed_by: string;
  sub_community?: string;
  publication_status: string;
  is_discoverable: boolean;
  completion_score: number;
}

const localUsersDb = new Map<string, UserRecord>(); // Keyed by phone_lookup_hash
const localProfilesDb = new Map<string, ProfileRecord>();
let sequenceCounter = 100001;

const registrationSchema = z.object({
  managedBy: z.enum(["SELF", "SON", "DAUGHTER", "BROTHER", "SISTER", "RELATIVE"]).default("SELF"),
  firstName: z.string().min(2, "Name must be at least 2 characters"),
  gender: z.enum(["MALE", "FEMALE"]),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  heightCm: z.number().min(100).max(250).optional(),
  maritalStatus: z.enum(["NEVER_MARRIED", "DIVORCED", "WIDOWED", "AWAITING_DIVORCE"]).default("NEVER_MARRIED"),
  state: z.string().min(2),
  city: z.string().min(2),
  subCommunity: z.string().optional(),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email address").optional(),
  aboutMe: z.string().max(1000).optional(),
  communityDeclaration: z.boolean().refine((val) => val === true, {
    message: "You must declare Pal (Gadaria) community affiliation",
  }),
  consentTerms: z.boolean().refine((val) => val === true, {
    message: "Consent to terms and privacy policy is mandatory",
  }),
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

    // 1. Invariant: Underage Rejection (DOB < 18)
    const age = calculateAge(data.dob);
    if (age < 18) {
      return NextResponse.json(
        { error: "Underage profiles are rejected. Candidate must be 18 years or older." },
        { status: 400 }
      );
    }

    // 2. Invariant: Phone Normalization & Duplicate Blind Index Lookup
    const normalizedPhone = normalizePhoneNumber(data.phone);
    const phoneHash = hashPhoneNumber(normalizedPhone);

    if (localUsersDb.has(phoneHash)) {
      return NextResponse.json(
        { error: "An account with this verified mobile number already exists." },
        { status: 409 }
      );
    }

    // 3. Optional Mercury AI Pre-Moderation on Free-Text (Condition C4)
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

    // 4. Invariant: Field-Level Encryption at Rest (AES-256-GCM)
    const encryptedPhone = encryptData(normalizedPhone);

    // 5. User Creation
    const userId = crypto.randomUUID();
    const userRecord: UserRecord = {
      id: userId,
      phone_lookup_hash: phoneHash,
      phone_encrypted: encryptedPhone.ciphertext,
      phone_iv: encryptedPhone.iv,
      phone_tag: encryptedPhone.tag,
      email: data.email,
      created_at: new Date().toISOString(),
    };
    localUsersDb.set(phoneHash, userRecord);

    // 6. Profile Creation with Unique Public ID (PAL######)
    const profileId = crypto.randomUUID();
    const publicId = generatePublicId(sequenceCounter++);

    const profileRecord: ProfileRecord = {
      id: profileId,
      public_id: publicId,
      owner_user_id: userId,
      first_name: data.firstName,
      gender: data.gender,
      dob: data.dob,
      age,
      height_cm: data.heightCm,
      marital_status: data.maritalStatus,
      state: data.state,
      city: data.city,
      managed_by: data.managedBy,
      sub_community: data.subCommunity,
      publication_status: "PENDING_REVIEW",
      is_discoverable: true,
      completion_score: 40,
    };
    localProfilesDb.set(profileId, profileRecord);

    // 7. Sanitized Response (NEVER exposes phone, email, or internal keys)
    return NextResponse.json({
      success: true,
      message: "Profile registered successfully",
      profile: {
        publicId: profileRecord.public_id,
        firstName: profileRecord.first_name,
        gender: profileRecord.gender,
        age: profileRecord.age,
        state: profileRecord.state,
        city: profileRecord.city,
        publicationStatus: profileRecord.publication_status,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
