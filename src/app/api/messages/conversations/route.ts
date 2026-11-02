import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await db.getConversationsList(session.profileId);
    return NextResponse.json({ success: true, conversations });
  } catch (error: any) {
    console.error("GET /api/messages/conversations error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load conversations" },
      { status: 500 }
    );
  }
}
