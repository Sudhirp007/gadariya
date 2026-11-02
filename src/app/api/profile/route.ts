import { NextResponse } from "next/server";
import { z } from "zod";
import { screenBioTextForPII } from "@/lib/ai/mercury";
import { activeProfiles, FullProfile } from "@/lib/profile/store";

function calculateCompletionScore(profile: FullProfile): number {
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
  const profile = activeProfiles.get("default-user");
  return NextResponse.json({ profile });
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

    let profile = activeProfiles.get("default-user");
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    profile = {
      ...profile,
      ...updates,
    };
    profile.completionScore = calculateCompletionScore(profile);
    activeProfiles.set("default-user", profile);

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
