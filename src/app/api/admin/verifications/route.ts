import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Admin session required" }, { status: 401 });
    }

    const queue = await db.getVerificationQueue();
    return NextResponse.json({ success: true, queue });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const moderateVerificationSchema = z.object({
  verificationId: z.string().uuid(),
  action: z.enum(["APPROVED", "REJECTED", "REVOKED"]),
  notes: z.string().min(3, "Moderator review notes are mandatory"),
});

export async function POST(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Admin session required" }, { status: 401 });
    }

    // Role check: Only SUPER_ADMIN and VERIFICATION_ADMIN can review verifications
    if (session.role !== "SUPER_ADMIN" && session.role !== "VERIFICATION_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions for verification review" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = moderateVerificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid parameters", details: parsed.error.format() }, { status: 400 });
    }

    const { verificationId, action, notes } = parsed.data;

    const result = await db.moderateVerification(session.adminId, verificationId, action, notes);

    return NextResponse.json({
      success: true,
      message: `Verification ${action.toLowerCase()} successfully`,
      verification: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
