import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedProfileId } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getAuthenticatedProfileId();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shares = await db.getBiodataShares(session.profileId);
    return NextResponse.json({ success: true, ...shares });
  } catch (error: any) {
    console.error("GET /api/biodata-shares error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch biodata shares" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedProfileId();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { targetPublicId } = body;

    if (!targetPublicId) {
      return NextResponse.json(
        { error: "Target candidate public ID is required" },
        { status: 400 }
      );
    }

    const targetProfileRes = await db.query(
      `SELECT id FROM public.profiles WHERE public_id = $1 AND publication_status = 'PUBLISHED' LIMIT 1;`,
      [targetPublicId]
    );

    const target = targetProfileRes.rows[0];
    if (!target) {
      return NextResponse.json(
        { error: "Target candidate not found or not published" },
        { status: 404 }
      );
    }

    const share = await db.requestBiodataShare(target.id, session.profileId);
    return NextResponse.json({ success: true, share });
  } catch (error: any) {
    console.error("POST /api/biodata-shares error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to request biodata share" },
      { status: 500 }
    );
  }
}
