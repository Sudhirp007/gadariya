import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Admin session required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PENDING";
    const photos = await db.getAdminPhotos(status);

    return NextResponse.json({ success: true, photos });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const moderatePhotoSchema = z.object({
  photoId: z.string().uuid(),
  action: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().optional().default(""),
});

export async function POST(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Admin session required" }, { status: 401 });
    }

    if (session.role !== "SUPER_ADMIN" && session.role !== "MODERATOR" && session.role !== "VERIFICATION_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = moderatePhotoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid photo moderation request" }, { status: 400 });
    }

    const { photoId, action, notes } = parsed.data;
    const updated = await db.moderatePhoto(session.adminId, photoId, action, notes);
    if (!updated) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Photo ${action.toLowerCase()} successfully`,
      photo: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
