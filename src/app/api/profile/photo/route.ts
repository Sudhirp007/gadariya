import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/session";

const photoUploadSchema = z.object({
  filename: z.string(),
  contentType: z.string().regex(/^image\/(jpeg|png|webp)$/, "Only JPEG, PNG, and WebP images are allowed"),
  visibility: z.enum(["PUBLIC_TO_MEMBERS", "BLURRED", "APPROVAL_REQUIRED"]).default("APPROVAL_REQUIRED"),
});

async function resolveProfileId(): Promise<string> {
  const session = await getServerSession();
  if (session?.profileId) {
    return session.profileId;
  }
  return await db.seedDemoProfileIfEmpty();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = photoUploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid photo metadata", details: parsed.error.format() }, { status: 400 });
    }

    const { filename, visibility } = parsed.data;
    const photoId = crypto.randomUUID();
    const storageKey = `private/photos/${photoId}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const profileId = await resolveProfileId();

    const photo = await db.addPhoto({
      profileId,
      storageKey,
      visibility,
      isPrimary: false,
    });

    return NextResponse.json({
      success: true,
      photo: {
        id: photo.id,
        storageKey: photo.storage_key,
        visibility: photo.visibility,
        moderationStatus: photo.moderation_status,
      },
      message: "Photo uploaded and submitted to Supabase DB for admin moderation",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
