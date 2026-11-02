import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await params;
    const [memberSession, adminSession] = await Promise.all([
      getServerSession(),
      getAdminSession(),
    ]);

    if (!memberSession?.profileId && !adminSession) {
      return NextResponse.json({ error: "Authentication required to view private photos" }, { status: 401 });
    }

    const photo = await db.getPhotoById(photoId);
    if (!photo || !photo.image_data) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const isOwner = memberSession?.profileId === photo.profile_id;
    const isAdmin = !!adminSession;

    if (!isOwner && !isAdmin) {
      if (photo.moderation_status !== "APPROVED") {
        return NextResponse.json({ error: "Photo pending moderation" }, { status: 403 });
      }
      if (photo.visibility === "APPROVAL_REQUIRED") {
        const hasShareAccess = await db.checkBiodataAccess(
          photo.profile_id,
          memberSession!.profileId
        );
        if (!hasShareAccess) {
          return NextResponse.json(
            { error: "Explicit photo/biodata access approval required from candidate" },
            { status: 403 }
          );
        }
      }
    }

    // Parse data URL: data:image/jpeg;base64,....
    const match = String(photo.image_data).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Stored photo format invalid" }, { status: 422 });
    }

    const mimeType = match[1];
    const binary = Buffer.from(match[2], "base64");

    return new NextResponse(binary, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": binary.length.toString(),
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
