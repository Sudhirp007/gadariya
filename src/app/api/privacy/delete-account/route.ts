import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedProfileId } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedProfileId();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { confirmation, reason } = body;

    if (confirmation !== "DELETE MY ACCOUNT") {
      return NextResponse.json(
        {
          error:
            "Invalid confirmation. Please type 'DELETE MY ACCOUNT' to confirm statutory erasure.",
        },
        { status: 400 }
      );
    }

    const result = await db.requestAccountDeletion(session.userId, reason);

    const response = NextResponse.json({
      message:
        "Your account deletion request has been submitted under DPDP Act 2025. Your profile has been immediately hidden and archived. All active biodata shares have been revoked.",
      ...result,
    });

    // Clear session cookie immediately
    response.cookies.delete("pal_session");
    return response;
  } catch (error: any) {
    console.error("POST /api/privacy/delete-account error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process account deletion" },
      { status: 500 }
    );
  }
}
