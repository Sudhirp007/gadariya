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

async function resolveProfileId(): Promise<string> {
  const session = await getServerSession();
  if (session?.profileId) {
    return session.profileId;
  }
  // Fallback to ensuring and returning demo seed profile
  return await db.seedDemoProfileIfEmpty();
}

export async function GET() {
  try {
    const profileId = await resolveProfileId();
    const profile = await db.getFullProfile(profileId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const updateProfileSchema = z.object({
  highestEducation: z.string().optional(),
  educationDetail: z.string().optional(),
  employedIn: z.string().optional(),
  occupation: z.string().optional(),
  annualIncomeRange: z.string().optional(),
  diet: z.string().optional(),
  aboutMe: z.string().max(1000).optional(),
  // Family
  fatherOccupation: z.string().optional(),
  motherOccupation: z.string().optional(),
  brothersCount: z.number().min(0).optional(),
  sistersCount: z.number().min(0).optional(),
  familyType: z.enum(["NUCLEAR", "JOINT"]).optional(),
  familyValues: z.enum(["TRADITIONAL", "MODERATE", "LIBERAL"]).optional(),
  familyLocation: z.string().optional(),
  aboutFamily: z.string().max(1000).optional(),
  // Preferences
  prefMinAge: z.number().min(18).optional(),
  prefMaxAge: z.number().min(18).optional(),
  prefMinHeightCm: z.number().optional(),
  prefMaxHeightCm: z.number().optional(),
  prefMaritalStatus: z.array(z.string()).optional(),
  prefStates: z.array(z.string()).optional(),
  prefCities: z.array(z.string()).optional(),
  // Publication Status
  publicationStatus: z.enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "SUSPENDED"]).optional(),
  isDiscoverable: z.boolean().optional(),
});

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
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

    const profileId = await resolveProfileId();
    const existing = await db.getFullProfile(profileId);
    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const merged = { ...existing, ...updates };
    const newCompletionScore = calculateCompletionScore(merged);

    const updatedProfile = await db.updateFullProfile(profileId, {
      completionScore: newCompletionScore,
      publicationStatus: updates.publicationStatus,
      details: {
        highestEducation: updates.highestEducation,
        educationDetail: updates.educationDetail,
        employedIn: updates.employedIn,
        occupation: updates.occupation,
        annualIncomeRange: updates.annualIncomeRange,
        diet: updates.diet,
        aboutMe: updates.aboutMe,
      },
      family: {
        fatherOccupation: updates.fatherOccupation,
        motherOccupation: updates.motherOccupation,
        brothersCount: updates.brothersCount,
        sistersCount: updates.sistersCount,
        familyType: updates.familyType,
        familyValues: updates.familyValues,
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

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully in PostgreSQL",
      profile: updatedProfile,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
