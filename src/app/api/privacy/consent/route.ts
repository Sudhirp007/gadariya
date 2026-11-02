import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedProfileId } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getAuthenticatedProfileId();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const records = await db.getConsentRecords(session.userId);
    return NextResponse.json({ success: true, records });
  } catch (error: any) {
    console.error("GET /api/privacy/consent error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch consent records" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedProfileId();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { purpose } = body;

    if (!purpose) {
      return NextResponse.json(
        { error: "Consent purpose is required to withdraw consent" },
        { status: 400 }
      );
    }

    const updated = await db.withdrawConsent(session.userId, purpose);
    return NextResponse.json({
      success: true,
      message: `Consent for ${purpose} has been successfully withdrawn.`,
      updated,
    });
  } catch (error: any) {
    console.error("POST /api/privacy/consent error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to withdraw consent" },
      { status: 500 }
    );
  }
}
