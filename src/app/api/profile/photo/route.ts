import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { activeProfiles } from "@/lib/profile/store";

const photoUploadSchema = z.object({
  filename: z.string(),
  contentType: z.string().regex(/^image\/(jpeg|png|webp)$/, "Only JPEG, PNG, and WebP images are allowed"),
  visibility: z.enum(["PUBLIC_TO_MEMBERS", "BLURRED", "APPROVAL_REQUIRED"]).default("APPROVAL_REQUIRED"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = photoUploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid photo metadata", details: parsed.error.format() }, { status: 400 });
    }

    const { filename, contentType, visibility } = parsed.data;
    const photoId = crypto.randomUUID();
    const storageKey = `private/photos/${photoId}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Update profile with new photo in PENDING moderation status
    const profile = activeProfiles.get("default-user");
    if (profile) {
      if (!profile.photos) profile.photos = [];
      profile.photos.push({
        id: photoId,
        storageKey,
        visibility,
        moderationStatus: "PENDING", // PRD invariant: photo starts PENDING admin review
      });
      activeProfiles.set("default-user", profile);
    }

    return NextResponse.json({
      success: true,
      photo: {
        id: photoId,
        storageKey,
        visibility,
        moderationStatus: "PENDING",
      },
      message: "Photo uploaded successfully and submitted for admin moderation",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
