import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/session";

const photoUploadSchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().regex(/^image\/(jpeg|png|webp)$/, "Only JPEG, PNG, and WebP images are allowed"),
  visibility: z.enum(["PUBLIC_TO_MEMBERS", "BLURRED", "APPROVAL_REQUIRED"]).default("APPROVAL_REQUIRED"),
  isPrimary: z.boolean().optional(),
  imageData: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Valid image data is required")
    .max(3_000_000, "Compressed photo must be under 2MB"),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = photoUploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please select a valid JPEG, PNG, or WebP photo under 5MB.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { filename, visibility, isPrimary, imageData } = parsed.data;
    const photoId = crypto.randomUUID();
    const storageKey = `private/photos/${photoId}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const photo = await db.addPhoto({
      profileId: session.profileId,
      storageKey,
      visibility,
      isPrimary,
      imageData,
    });

    await db.logAuditEvent({
      actorId: session.userId,
      action: "PHOTO_UPLOADED",
      targetType: "PHOTO",
      targetId: photo.id,
      metadata: { visibility, isPrimary: photo.is_primary },
    });

    return NextResponse.json({
      success: true,
      photo: {
        id: photo.id,
        storageKey: photo.storage_key,
        visibility: photo.visibility,
        moderationStatus: photo.moderation_status,
        isPrimary: photo.is_primary,
        hasImage: !!photo.has_image,
      },
      message: "Photo uploaded successfully and sent for admin moderation.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const photoPatchSchema = z.object({
  photoId: z.string().uuid(),
  visibility: z.enum(["PUBLIC_TO_MEMBERS", "BLURRED", "APPROVAL_REQUIRED"]).optional(),
  isPrimary: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = photoPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid photo update parameters" }, { status: 400 });
    }

    const updated = await db.updatePhoto(session.profileId, parsed.data.photoId, {
      visibility: parsed.data.visibility,
      isPrimary: parsed.data.isPrimary,
    });

    if (!updated) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      photo: {
        id: updated.id,
        storageKey: updated.storage_key,
        visibility: updated.visibility,
        moderationStatus: updated.moderation_status,
        isPrimary: updated.is_primary,
        hasImage: !!updated.has_image,
      },
      message: "Photo privacy settings updated.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get("photoId");
    if (!photoId) {
      return NextResponse.json({ error: "photoId query parameter required" }, { status: 400 });
    }

    const deleted = await db.deletePhoto(session.profileId, photoId);
    if (!deleted) {
      return NextResponse.json({ error: "Photo not found or unauthorized" }, { status: 404 });
    }

    await db.logAuditEvent({
      actorId: session.userId,
      action: "PHOTO_DELETED",
      targetType: "PHOTO",
      targetId: photoId,
    });

    return NextResponse.json({ success: true, message: "Photo deleted permanently." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
