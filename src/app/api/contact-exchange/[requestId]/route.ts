import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const session = await getServerSession();
    let profileId = session?.profileId;

    if (!profileId) {
      profileId = await db.seedDemoProfileIfEmpty();
    }

    const disclosed = await db.getDisclosedContact(requestId, profileId);

    return NextResponse.json({
      success: true,
      message: "Contact details decrypted under verified bilateral dual approval",
      contact: disclosed,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    const status = msg.includes("PRIVACY VIOLATION") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
