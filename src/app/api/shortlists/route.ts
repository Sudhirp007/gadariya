import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const shortlists = await db.getShortlistsForProfile(session.profileId);
    return NextResponse.json({ success: true, shortlists });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const shortlistSchema = z.object({
  targetProfileId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const body = await req.json();
    const parsed = shortlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "targetProfileId is required" }, { status: 400 });
    }

    const { targetProfileId } = parsed.data;
    const result = await db.toggleShortlist(session.profileId, targetProfileId);

    return NextResponse.json({
      success: true,
      shortlisted: result.shortlisted,
      message: result.shortlisted ? "Candidate added to your private shortlist" : "Candidate removed from shortlist",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
