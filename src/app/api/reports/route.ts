import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportedPublicId, category, details } = await req.json();
    if (!reportedPublicId || !category) {
      return NextResponse.json(
        { error: "reportedPublicId and category are required" },
        { status: 400 }
      );
    }

    const targetRes = await db.query(
      `SELECT id FROM public.profiles WHERE public_id = $1 LIMIT 1;`,
      [reportedPublicId]
    );
    const target = targetRes.rows[0];
    if (!target) {
      return NextResponse.json({ error: "Target profile not found" }, { status: 404 });
    }

    const report = await db.reportProfile(
      session.profileId,
      target.id,
      category,
      details
    );

    return NextResponse.json({
      success: true,
      message:
        "Thank you. Your report has been submitted to the community moderation desk for urgent investigation.",
      reportId: report.id,
    });
  } catch (error: any) {
    console.error("POST /api/reports error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit report" },
      { status: 500 }
    );
  }
}
