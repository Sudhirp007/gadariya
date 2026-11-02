import { NextResponse } from "next/server";
import { z } from "zod";
import { screenBioTextForPII } from "@/lib/ai/mercury";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/session";

function calculateCompletionScore(profile: any): number {
  let score = 20; // Basic details (name, dob, gender, city)
  if (profile.highestEducation && profile.occupation) score += 15;
  if (profile.fatherOccupation && profile.familyType) score += 15;
  if (profile.prefMinAge && profile.prefMaxAge) score += 15;
  if (profile.aboutMe && profile.aboutMe.length > 20) score += 10;
  if (profile.photos && profile.photos.length > 0) score += 10;
  if (profile.publicationStatus === "PUBLISHED") score += 15;
  return Math.min(score, 100);
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const profile = await db.getFullProfile(session.profileId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const optStr = z.string().nullable().optional();
const optEnum = <T extends [string, ...string[]]>(vals: T) =>
  z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.enum(vals).optional()
  );

const updateProfileSchema = z.object({
  // Core profile fields
  firstName: z.string().min(2).max(80).optional(),
  heightCm: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().min(100).max(250).nullable().optional()
  ),
  maritalStatus: optEnum(["NEVER_MARRIED", "DIVORCED", "WIDOWED", "AWAITING_DIVORCE"]),
  state: z.string().min(2).max(80).optional(),
  city: z.string().min(2).max(80).optional(),
  subCommunity: optStr,
  isDiscoverable: z.boolean().optional(),
  // Details
  highestEducation: optStr,
  educationDetail: optStr,
  employedIn: optEnum(["PRIVATE", "GOVERNMENT", "BUSINESS", "DEFENCE", "NOT_WORKING", "OTHER"]),
  occupation: optStr,
  annualIncomeRange: optStr,
  diet: optEnum(["VEGETARIAN", "NON_VEGETARIAN", "EGGETARIAN", "JAIN"]),
  aboutMe: z.string().max(1000).nullable().optional(),
  // Family
  fatherOccupation: optStr,
  motherOccupation: optStr,
  brothersCount: z.number().min(0).optional(),
  sistersCount: z.number().min(0).optional(),
  familyType: optEnum(["NUCLEAR", "JOINT"]),
  familyValues: optEnum(["TRADITIONAL", "MODERATE", "LIBERAL"]),
  familyLocation: optStr,
  aboutFamily: z.string().max(1000).nullable().optional(),
  // Preferences
  prefMinAge: z.number().min(18).max(80).optional(),
  prefMaxAge: z.number().min(18).max(80).optional(),
  prefMinHeightCm: z.number().min(100).max(250).optional(),
  prefMaxHeightCm: z.number().min(100).max(250).optional(),
  prefMaritalStatus: z.array(z.string()).optional(),
  prefStates: z.array(z.string()).optional(),
  prefCities: z.array(z.string()).optional(),
});

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed. Please review your entries.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // Condition C4: Mercury AI Pre-Moderation on Free-Text updates
    if (updates.aboutMe) {
      const piiCheck = await screenBioTextForPII(updates.aboutMe);
      if (piiCheck.hasPII) {
        return NextResponse.json(
          { error: "Contact details detected in About Me. Please remove phone numbers or emails before saving." },
          { status: 422 }
        );
      }
    }

    if (updates.aboutFamily) {
      const piiCheck = await screenBioTextForPII(updates.aboutFamily);
      if (piiCheck.hasPII) {
        return NextResponse.json(
          { error: "Contact details detected in Family Details. Please remove phone numbers or addresses." },
          { status: 422 }
        );
      }
    }

    const profileId = session.profileId;
    const existing = await db.getFullProfile(profileId);
    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const merged = { ...existing, ...updates };
    const newCompletionScore = calculateCompletionScore(merged);

    const updatedProfile = await db.updateFullProfile(profileId, {
      firstName: updates.firstName,
      heightCm: updates.heightCm,
      maritalStatus: updates.maritalStatus,
      state: updates.state,
      city: updates.city,
      subCommunity: updates.subCommunity,
      isDiscoverable: updates.isDiscoverable,
      completionScore: newCompletionScore,
      details: {
        highestEducation: updates.highestEducation,
        educationDetail: updates.educationDetail,
        employedIn: updates.employedIn ?? (body.employedIn === "" ? null : undefined),
        occupation: updates.occupation,
        annualIncomeRange: updates.annualIncomeRange,
        diet: updates.diet ?? (body.diet === "" ? null : undefined),
        aboutMe: updates.aboutMe,
      },
      family: {
        fatherOccupation: updates.fatherOccupation,
        motherOccupation: updates.motherOccupation,
        brothersCount: updates.brothersCount,
        sistersCount: updates.sistersCount,
        familyType: updates.familyType ?? (body.familyType === "" ? null : undefined),
        familyValues: updates.familyValues ?? (body.familyValues === "" ? null : undefined),
        familyLocation: updates.familyLocation,
        aboutFamily: updates.aboutFamily,
      },
      preferences: {
        minAge: updates.prefMinAge,
        maxAge: updates.prefMaxAge,
        minHeightCm: updates.prefMinHeightCm,
        maxHeightCm: updates.prefMaxHeightCm,
        maritalStatusAllowed: updates.prefMaritalStatus,
        preferredStates: updates.prefStates,
        preferredCities: updates.prefCities,
      },
    });

    await db.logAuditEvent({
      actorId: session.userId,
      action: "PROFILE_UPDATED",
      targetType: "PROFILE",
      targetId: profileId,
    });

    return NextResponse.json({
      success: true,
      message: "Profile saved successfully!",
      profile: updatedProfile,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
