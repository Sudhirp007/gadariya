import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedProfileId } from "@/lib/auth/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;
    const session = await getAuthenticatedProfileId();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (!["APPROVE", "DECLINE", "REVOKE"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be APPROVE, DECLINE, or REVOKE." },
        { status: 400 }
      );
    }

    const updated = await db.respondBiodataShare(
      shareId,
      session.profileId,
      action as "APPROVE" | "DECLINE" | "REVOKE"
    );

    return NextResponse.json({ success: true, share: updated });
  } catch (error: any) {
    console.error("PATCH /api/biodata-shares/[shareId] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update biodata share" },
      { status: 500 }
    );
  }
}
