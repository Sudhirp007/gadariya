import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;
    const session = await getServerSession();

    const profile = await db.getPublicProfileByPublicId(publicId, session?.profileId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found or not published" }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
