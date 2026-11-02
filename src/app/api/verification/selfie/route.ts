import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getServerSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

const selfieUploadSchema = z.object({
  filename: z.string().optional().default("selfie.jpg"),
  contentType: z.string().regex(/^image\/(jpeg|png|webp)$/, "Only JPEG, PNG, or WebP images are allowed"),
  imageBase64: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    let profileId = session?.profileId;

    if (!profileId) {
      profileId = await db.seedDemoProfileIfEmpty();
    }

    const body = await req.json();
    const parsed = selfieUploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid selfie payload", details: parsed.error.format() }, { status: 400 });
    }

    const { filename } = parsed.data;
    const selfieId = crypto.randomUUID();
    const selfieStorageKey = `private/verification/selfies/${profileId}-${selfieId}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const verificationRecord = await db.submitVerificationRequest({
      profileId,
      verificationType: "SELFIE",
      selfieStorageKey,
    });

    await db.logAuditEvent({
      actorId: session?.userId || "anonymous",
      action: "SELFIE_SUBMITTED_FOR_VERIFICATION",
      targetType: "VERIFICATION_REQUEST",
      targetId: verificationRecord.id,
      metadata: { profileId, selfieStorageKey },
    });

    return NextResponse.json({
      success: true,
      message: "Selfie submitted successfully and placed in moderator review queue",
      verification: verificationRecord,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
