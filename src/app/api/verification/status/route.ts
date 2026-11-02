import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession();
    let profileId = session?.profileId;

    if (!profileId) {
      profileId = await db.seedDemoProfileIfEmpty();
    }

    const verificationInfo = await db.getVerificationBadges(profileId);
    return NextResponse.json({ success: true, verification: verificationInfo });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
