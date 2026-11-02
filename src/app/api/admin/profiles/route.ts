import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Admin session required" }, { status: 401 });
    }

    const profiles = await db.getPendingProfiles();
    return NextResponse.json({ success: true, profiles });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const moderateSchema = z.object({
  profileId: z.string().uuid(),
  action: z.enum(["PUBLISHED", "REJECTED", "SUSPENDED"]),
  notes: z.string().min(3, "Mandatory audit reason must be at least 3 characters"),
});

export async function POST(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Admin session required" }, { status: 401 });
    }

    // Role check: Only SUPER_ADMIN and MODERATOR can moderate profiles
    if (session.role !== "SUPER_ADMIN" && session.role !== "MODERATOR") {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions for profile moderation" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = moderateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid moderation parameters", details: parsed.error.format() }, { status: 400 });
    }

    const { profileId, action, notes } = parsed.data;

    const result = await db.moderateProfile(session.adminId, profileId, action, notes);

    return NextResponse.json({
      success: true,
      message: `Profile ${action.toLowerCase()} successfully`,
      profile: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
